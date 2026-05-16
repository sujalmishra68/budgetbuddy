from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os, logging, bcrypt, jwt, csv, io
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors as rl_colors
import calendar as cal_module

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# App
app = FastAPI(title="Expense Tracker API", docs_url="/api/docs", openapi_url="/api/openapi.json")
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# JWT
JWT_ALGORITHM = "HS256"
def get_jwt_secret():
    return os.environ["JWT_SECRET"]

# Password helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# Token helpers
def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=1), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

# Auth dependency
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== PYDANTIC MODELS ====================
class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class ExpenseInput(BaseModel):
    amount: float
    category_id: str
    category_name: str
    date: str
    notes: Optional[str] = ""
    payment_method: str = "cash"

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None
    payment_method: Optional[str] = None

class CategoryInput(BaseModel):
     
    name: str
    icon: str = "tag"
    color: str = "#2563EB"

class BudgetInput(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    amount: float
    month: int
    year: int

class ProfileUpdate(BaseModel):
    name: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class RecurringExpenseInput(BaseModel):
    amount: float
    category_id: str
    category_name: str
    notes: Optional[str] = ""
    payment_method: str = "cash"
    frequency: str
    next_date: str
    is_active: bool = True

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/register")
async def register(input: RegisterInput, response: Response):
    email = input.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(input.password),
        "name": input.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": input.name, "role": "user"}

@api_router.post("/auth/login")
async def login(input: LoginInput, request: Request, response: Response):
    email = input.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("attempts", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < datetime.fromisoformat(locked_until):
            raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"attempts": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": user.get("name", ""), "role": user.get("role", "user")}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access = create_access_token(user_id, user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ==================== CATEGORY ROUTES ====================
@api_router.get("/categories")
async def get_categories(request: Request):
    user = await get_current_user(request)
    categories = await db.categories.find(
        {"$or": [{"is_predefined": True}, {"user_id": user["_id"]}]},
        {"_id": 0}
    ).to_list(100)
    return categories

@api_router.post("/categories")
async def create_category(input: CategoryInput, request: Request):
    user = await get_current_user(request)
    cat_id = str(ObjectId())
    doc = {
        "id": cat_id, "user_id": user["_id"], "name": input.name,
        "icon": input.icon, "color": input.color, "is_predefined": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.categories.insert_one(doc)
    return await db.categories.find_one({"id": cat_id}, {"_id": 0})

@api_router.put("/categories/{cat_id}")
async def update_category(cat_id: str, input: CategoryInput, request: Request):
    user = await get_current_user(request)
    result = await db.categories.update_one(
        {"id": cat_id, "user_id": user["_id"], "is_predefined": False},
        {"$set": {"name": input.name, "icon": input.icon, "color": input.color}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found or not editable")
    return await db.categories.find_one({"id": cat_id}, {"_id": 0})

@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.categories.delete_one({"id": cat_id, "user_id": user["_id"], "is_predefined": False})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found or not deletable")
    return {"message": "Deleted"}

# ==================== EXPENSE ROUTES ====================
@api_router.get("/expenses")
async def get_expenses(
    request: Request,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    payment_method: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    user = await get_current_user(request)
    query = {"user_id": user["_id"]}
    if category:
        query["category_id"] = category
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        query["date"] = date_filter
    if search:
        query["$or"] = [
            {"notes": {"$regex": search, "$options": "i"}},
            {"category_name": {"$regex": search, "$options": "i"}},
        ]
    if payment_method:
        query["payment_method"] = payment_method
    skip = (page - 1) * limit
    total = await db.expenses.count_documents(query)
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    return {"expenses": expenses, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}

@api_router.post("/expenses")
async def create_expense(input: ExpenseInput, request: Request):
    user = await get_current_user(request)
    expense_id = str(ObjectId())
    doc = {
        "id": expense_id, "user_id": user["_id"],
        "amount": input.amount, "category_id": input.category_id,
        "category_name": input.category_name, "date": input.date,
        "notes": input.notes or "", "payment_method": input.payment_method,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.expenses.insert_one(doc)
    return await db.expenses.find_one({"id": expense_id}, {"_id": 0})

@api_router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, input: ExpenseUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.expenses.update_one({"id": expense_id, "user_id": user["_id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return await db.expenses.find_one({"id": expense_id}, {"_id": 0})

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.expenses.delete_one({"id": expense_id, "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Deleted"}

# ==================== BUDGET ROUTES ====================
@api_router.get("/budgets")
async def get_budgets(request: Request, month: Optional[int] = None, year: Optional[int] = None):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year
    budgets = await db.budgets.find({"user_id": user["_id"], "month": m, "year": y}, {"_id": 0}).to_list(100)
    start = f"{y}-{m:02d}-01"
    end_day = cal_module.monthrange(y, m)[1]
    end = f"{y}-{m:02d}-{end_day:02d}"
    for budget in budgets:
        spent_query = {"user_id": user["_id"], "date": {"$gte": start, "$lte": end}}
        if budget.get("category_id"):
            spent_query["category_id"] = budget["category_id"]
        pipeline = [{"$match": spent_query}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
        result = await db.expenses.aggregate(pipeline).to_list(1)
        budget["spent"] = result[0]["total"] if result else 0
    return budgets

@api_router.post("/budgets")
async def create_budget(input: BudgetInput, request: Request):
    user = await get_current_user(request)
    budget_id = str(ObjectId())
    doc = {
        "id": budget_id, "user_id": user["_id"],
        "category_id": input.category_id, "category_name": input.category_name,
        "amount": input.amount, "month": input.month, "year": input.year,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.budgets.insert_one(doc)
    return await db.budgets.find_one({"id": budget_id}, {"_id": 0})

@api_router.put("/budgets/{budget_id}")
async def update_budget(budget_id: str, input: BudgetInput, request: Request):
    user = await get_current_user(request)
    result = await db.budgets.update_one(
        {"id": budget_id, "user_id": user["_id"]},
        {"$set": {"category_id": input.category_id, "category_name": input.category_name, "amount": input.amount, "month": input.month, "year": input.year}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return await db.budgets.find_one({"id": budget_id}, {"_id": 0})

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.budgets.delete_one({"id": budget_id, "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Deleted"}

# ==================== DASHBOARD ROUTES ====================
@api_router.get("/dashboard/stats")
async def dashboard_stats(request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    start_month = f"{now.year}-{now.month:02d}-01"
    end_day = cal_module.monthrange(now.year, now.month)[1]
    end_month = f"{now.year}-{now.month:02d}-{end_day:02d}"

    total_pipeline = [{"$match": {"user_id": user["_id"]}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    total_result = await db.expenses.aggregate(total_pipeline).to_list(1)
    total_expenses = total_result[0]["total"] if total_result else 0

    month_pipeline = [
        {"$match": {"user_id": user["_id"], "date": {"$gte": start_month, "$lte": end_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    month_result = await db.expenses.aggregate(month_pipeline).to_list(1)
    month_expenses = month_result[0]["total"] if month_result else 0

    cat_pipeline = [
        {"$match": {"user_id": user["_id"], "date": {"$gte": start_month, "$lte": end_month}}},
        {"$group": {"_id": {"category_id": "$category_id", "category_name": "$category_name"}, "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
    ]
    cat_result = await db.expenses.aggregate(cat_pipeline).to_list(20)
    category_breakdown = [{"category_id": r["_id"]["category_id"], "category_name": r["_id"]["category_name"], "total": r["total"]} for r in cat_result]

    budgets = await db.budgets.find({"user_id": user["_id"], "month": now.month, "year": now.year}, {"_id": 0}).to_list(100)
    total_budget = sum(b["amount"] for b in budgets)

    recent = await db.expenses.find({"user_id": user["_id"]}, {"_id": 0}).sort("date", -1).limit(5).to_list(5)
    expense_count = await db.expenses.count_documents({"user_id": user["_id"]})

    return {
        "total_expenses": total_expenses, "month_expenses": month_expenses,
        "total_budget": total_budget, "budget_remaining": total_budget - month_expenses,
        "category_breakdown": category_breakdown, "recent_transactions": recent,
        "expense_count": expense_count,
    }

@api_router.get("/dashboard/trends")
async def dashboard_trends(request: Request, period: str = "monthly"):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    trends = []
    if period == "weekly":
        for i in range(11, -1, -1):
            week_start = now - timedelta(weeks=i, days=now.weekday())
            week_end = week_start + timedelta(days=6)
            start = week_start.strftime("%Y-%m-%d")
            end = week_end.strftime("%Y-%m-%d")
            pipeline = [{"$match": {"user_id": user["_id"], "date": {"$gte": start, "$lte": end}}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
            result = await db.expenses.aggregate(pipeline).to_list(1)
            trends.append({"label": f"W{12 - i}", "date": start, "total": result[0]["total"] if result else 0})
    else:
        for i in range(5, -1, -1):
            month = now.month - i
            year = now.year
            if month <= 0:
                month += 12
                year -= 1
            end_day = cal_module.monthrange(year, month)[1]
            start = f"{year}-{month:02d}-01"
            end = f"{year}-{month:02d}-{end_day:02d}"
            pipeline = [{"$match": {"user_id": user["_id"], "date": {"$gte": start, "$lte": end}}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
            result = await db.expenses.aggregate(pipeline).to_list(1)
            trends.append({"label": cal_module.month_abbr[month], "date": start, "total": result[0]["total"] if result else 0})
    return trends

# ==================== EXPORT ROUTES ====================
@api_router.get("/export/csv")
async def export_csv(request: Request):
    user = await get_current_user(request)
    expenses = await db.expenses.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0}).sort("date", -1).to_list(10000)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["date", "category_name", "amount", "payment_method", "notes"], extrasaction="ignore")
    writer.writeheader()
    for exp in expenses:
        writer.writerow(exp)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=expenses_{datetime.now().strftime('%Y%m%d')}.csv"},
    )

@api_router.get("/export/pdf")
async def export_pdf(request: Request):
    user = await get_current_user(request)
    expenses = await db.expenses.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0}).sort("date", -1).to_list(10000)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []
    elements.append(Paragraph("Expense Report", styles["Title"]))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    elements.append(Spacer(1, 20))
    data = [["Date", "Category", "Amount", "Payment", "Notes"]]
    total = 0
    for exp in expenses:
        data.append([exp.get("date", ""), exp.get("category_name", ""), f"${exp.get('amount', 0):.2f}", exp.get("payment_method", ""), (exp.get("notes", "") or "")[:30]])
        total += exp.get("amount", 0)
    data.append(["", "TOTAL", f"${total:.2f}", "", ""])
    table = Table(data, colWidths=[80, 100, 70, 80, 150])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), rl_colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), rl_colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("BACKGROUND", (0, -1), (-1, -1), rl_colors.HexColor("#F1F5F9")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#E2E8F0")),
    ]))
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(
        buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=expenses_{datetime.now().strftime('%Y%m%d')}.pdf"},
    )

# ==================== RECURRING EXPENSES ====================
@api_router.get("/recurring-expenses")
async def get_recurring_expenses(request: Request):
    user = await get_current_user(request)
    return await db.recurring_expenses.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)

@api_router.post("/recurring-expenses")
async def create_recurring_expense(input: RecurringExpenseInput, request: Request):
    user = await get_current_user(request)
    rec_id = str(ObjectId())
    doc = {
        "id": rec_id, "user_id": user["_id"],
        "amount": input.amount, "category_id": input.category_id,
        "category_name": input.category_name, "notes": input.notes or "",
        "payment_method": input.payment_method, "frequency": input.frequency,
        "next_date": input.next_date, "is_active": input.is_active,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.recurring_expenses.insert_one(doc)
    return await db.recurring_expenses.find_one({"id": rec_id}, {"_id": 0})

@api_router.put("/recurring-expenses/{rec_id}")
async def update_recurring_expense(rec_id: str, input: RecurringExpenseInput, request: Request):
    user = await get_current_user(request)
    result = await db.recurring_expenses.update_one(
        {"id": rec_id, "user_id": user["_id"]},
        {"$set": {"amount": input.amount, "category_id": input.category_id, "category_name": input.category_name, "notes": input.notes, "payment_method": input.payment_method, "frequency": input.frequency, "next_date": input.next_date, "is_active": input.is_active}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return await db.recurring_expenses.find_one({"id": rec_id}, {"_id": 0})

@api_router.delete("/recurring-expenses/{rec_id}")
async def delete_recurring_expense(rec_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.recurring_expenses.delete_one({"id": rec_id, "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return {"message": "Deleted"}

async def process_recurring_expenses():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cursor = db.recurring_expenses.find({"is_active": True, "next_date": {"$lte": today}})
    async for rec in cursor:
        expense_id = str(ObjectId())
        await db.expenses.insert_one({
            "id": expense_id, "user_id": rec["user_id"],
            "amount": rec["amount"], "category_id": rec["category_id"],
            "category_name": rec["category_name"], "date": today,
            "notes": f"[Recurring] {rec.get('notes', '')}",
            "payment_method": rec["payment_method"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        next_date = datetime.strptime(rec["next_date"], "%Y-%m-%d")
        if rec["frequency"] == "daily":
            next_date += timedelta(days=1)
        elif rec["frequency"] == "weekly":
            next_date += timedelta(weeks=1)
        elif rec["frequency"] == "monthly":
            month = next_date.month + 1
            year = next_date.year
            if month > 12:
                month = 1
                year += 1
            day = min(next_date.day, cal_module.monthrange(year, month)[1])
            next_date = next_date.replace(year=year, month=month, day=day)
        elif rec["frequency"] == "yearly":
            next_date = next_date.replace(year=next_date.year + 1)
        await db.recurring_expenses.update_one({"id": rec["id"]}, {"$set": {"next_date": next_date.strftime("%Y-%m-%d")}})

# ==================== PROFILE ROUTES ====================
@api_router.get("/profile")
async def get_profile(request: Request):
    return await get_current_user(request)

@api_router.put("/profile")
async def update_profile(input: ProfileUpdate, request: Request):
    user = await get_current_user(request)
    update = {}
    if input.name:
        update["name"] = input.name
    if update:
        await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": update})
    updated = await db.users.find_one({"_id": ObjectId(user["_id"])})
    return {"_id": str(updated["_id"]), "email": updated["email"], "name": updated.get("name", ""), "role": updated.get("role", "user"), "created_at": updated.get("created_at", "")}

@api_router.put("/profile/password")
async def change_password(input: PasswordChange, request: Request):
    user = await get_current_user(request)
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not verify_password(input.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"password_hash": hash_password(input.new_password)}})
    return {"message": "Password updated"}

# ==================== STARTUP ====================
PREDEFINED_CATEGORIES = [
    {"name": "Food & Dining", "icon": "fork-knife", "color": "#E11D48"},
    {"name": "Transportation", "icon": "car", "color": "#2563EB"},
    {"name": "Shopping", "icon": "shopping-bag", "color": "#7C3AED"},
    {"name": "Entertainment", "icon": "game-controller", "color": "#F59E0B"},
    {"name": "Bills & Utilities", "icon": "lightning", "color": "#10B981"},
    {"name": "Healthcare", "icon": "heartbeat", "color": "#EC4899"},
    {"name": "Education", "icon": "graduation-cap", "color": "#3B82F6"},
    {"name": "Travel", "icon": "airplane", "color": "#06B6D4"},
    {"name": "Personal Care", "icon": "sparkle", "color": "#8B5CF6"},
    {"name": "Other", "icon": "dots-three", "color": "#64748B"},
]

async def seed_categories():
    for cat in PREDEFINED_CATEGORIES:
        existing = await db.categories.find_one({"name": cat["name"], "is_predefined": True})
        if not existing:
            await db.categories.insert_one({
                "id": str(ObjectId()), "user_id": None, "name": cat["name"],
                "icon": cat["icon"], "color": cat["color"], "is_predefined": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Admin", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.expenses.create_index([("user_id", 1), ("date", -1)])
    await db.categories.create_index("user_id")
    await db.budgets.create_index([("user_id", 1), ("month", 1), ("year", 1)])
    await seed_admin()
    await seed_categories()
    await process_recurring_expenses()
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write(f"## Admin\n- Email: {os.environ.get('ADMIN_EMAIL')}\n- Password: {os.environ.get('ADMIN_PASSWORD')}\n- Role: admin\n\n")
        f.write("## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")
    logging.info("Startup complete - admin seeded, categories seeded")

app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown():
    client.close()
