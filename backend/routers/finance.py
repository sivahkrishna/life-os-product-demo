import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/finance", tags=["finance"])


# ---------------- schemas ----------------
class AccountIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: Optional[str] = "checking"
    balance: Optional[float] = 0.0


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None


class AccountOut(BaseModel):
    id: int
    name: str
    type: str
    balance: float
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class TransactionIn(BaseModel):
    account_id: int
    category: str = Field(min_length=1, max_length=80)
    amount: float
    type: str  # income | expense
    date: datetime.date
    note: Optional[str] = None


class TransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = None
    date: Optional[datetime.date] = None
    note: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    account_id: int
    category: str
    amount: float
    type: str
    date: datetime.date
    note: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class BudgetIn(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    monthly_limit: float


class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    monthly_limit: Optional[float] = None


class BudgetOut(BaseModel):
    id: int
    category: str
    monthly_limit: float

    class Config:
        from_attributes = True


class CategoryTotal(BaseModel):
    category: str
    total: float


class FinanceSummary(BaseModel):
    total_balance: float
    month_income: float
    month_expense: float
    by_category: List[CategoryTotal]


# ---------------- helpers ----------------
def _get_account(db: Session, user: models.User, account_id: int) -> models.Account:
    acc = (
        db.query(models.Account)
        .filter(models.Account.id == account_id, models.Account.user_id == user.id)
        .first()
    )
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    return acc


def _get_transaction(db: Session, user: models.User, tx_id: int) -> models.Transaction:
    tx = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == tx_id, models.Transaction.user_id == user.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


def _get_budget(db: Session, user: models.User, budget_id: int) -> models.Budget:
    b = (
        db.query(models.Budget)
        .filter(models.Budget.id == budget_id, models.Budget.user_id == user.id)
        .first()
    )
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")
    return b


def _apply_balance(db: Session, account_id: int, tx_type: str, amount: float) -> None:
    acc = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not acc:
        return
    if tx_type == "income":
        acc.balance = (acc.balance or 0.0) + amount
    else:
        acc.balance = (acc.balance or 0.0) - amount


# ---------------- accounts ----------------
@router.get("/accounts", response_model=List[AccountOut])
def list_accounts(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Account)
        .filter(models.Account.user_id == user.id)
        .order_by(models.Account.created_at.asc())
        .all()
    )


@router.post("/accounts", response_model=AccountOut)
def create_account(
    payload: AccountIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    acc = models.Account(
        user_id=user.id,
        name=payload.name.strip(),
        type=payload.type or "checking",
        balance=float(payload.balance or 0.0),
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.get("/accounts/{account_id}", response_model=AccountOut)
def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _get_account(db, user, account_id)


@router.put("/accounts/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int,
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    acc = _get_account(db, user, account_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(acc, key, value)
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/accounts/{account_id}")
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    acc = _get_account(db, user, account_id)
    db.query(models.Transaction).filter(
        models.Transaction.account_id == acc.id, models.Transaction.user_id == user.id
    ).delete(synchronize_session=False)
    db.delete(acc)
    db.commit()
    return {"ok": True, "deleted_id": account_id}


# ---------------- transactions ----------------
@router.get("/transactions", response_model=List[TransactionOut])
def list_transactions(
    account_id: Optional[int] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    from_: Optional[datetime.date] = None,
    to: Optional[datetime.date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.Transaction).filter(models.Transaction.user_id == user.id)
    if account_id is not None:
        q = q.filter(models.Transaction.account_id == account_id)
    if category:
        q = q.filter(models.Transaction.category == category)
    if type:
        q = q.filter(models.Transaction.type == type)
    if from_ is not None:
        q = q.filter(models.Transaction.date >= from_)
    if to is not None:
        q = q.filter(models.Transaction.date <= to)
    return q.order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).all()


@router.post("/transactions", response_model=TransactionOut)
def create_transaction(
    payload: TransactionIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _get_account(db, user, payload.account_id)
    if payload.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="type must be 'income' or 'expense'")
    tx = models.Transaction(
        user_id=user.id,
        account_id=payload.account_id,
        category=payload.category.strip(),
        amount=float(payload.amount),
        type=payload.type,
        date=payload.date,
        note=payload.note,
    )
    db.add(tx)
    _apply_balance(db, payload.account_id, payload.type, float(payload.amount))
    db.commit()
    db.refresh(tx)
    return tx


@router.get("/transactions/{tx_id}", response_model=TransactionOut)
def get_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _get_transaction(db, user, tx_id)


@router.put("/transactions/{tx_id}", response_model=TransactionOut)
def update_transaction(
    tx_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    tx = _get_transaction(db, user, tx_id)
    data = payload.model_dump(exclude_unset=True)

    # reverse the old effect, then apply the new one
    _apply_balance(db, tx.account_id, tx.type, -float(tx.amount))
    db.flush()

    if "account_id" in data and data["account_id"] is not None:
        _get_account(db, user, data["account_id"])
    if "type" in data and data["type"] not in (None, "income", "expense"):
        raise HTTPException(status_code=400, detail="type must be 'income' or 'expense'")

    for key, value in data.items():
        setattr(tx, key, value)

    _apply_balance(db, tx.account_id, tx.type, float(tx.amount))
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/transactions/{tx_id}")
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    tx = _get_transaction(db, user, tx_id)
    _apply_balance(db, tx.account_id, tx.type, -float(tx.amount))
    db.delete(tx)
    db.commit()
    return {"ok": True, "deleted_id": tx_id}


# ---------------- budgets ----------------
@router.get("/budgets", response_model=List[BudgetOut])
def list_budgets(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Budget)
        .filter(models.Budget.user_id == user.id)
        .order_by(models.Budget.category.asc())
        .all()
    )


@router.post("/budgets", response_model=BudgetOut)
def create_budget(
    payload: BudgetIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    budget = models.Budget(
        user_id=user.id,
        category=payload.category.strip(),
        monthly_limit=float(payload.monthly_limit),
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.get("/budgets/{budget_id}", response_model=BudgetOut)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _get_budget(db, user, budget_id)


@router.put("/budgets/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    budget = _get_budget(db, user, budget_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(budget, key, value)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/budgets/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    budget = _get_budget(db, user, budget_id)
    db.delete(budget)
    db.commit()
    return {"ok": True, "deleted_id": budget_id}


# ---------------- summary ----------------
@router.get("/summary", response_model=FinanceSummary)
def summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    accounts = db.query(models.Account).filter(models.Account.user_id == user.id).all()
    total_balance = round(sum((a.balance or 0.0) for a in accounts), 2)

    today = datetime.date.today()
    month_start = today.replace(day=1)
    txs = (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == user.id, models.Transaction.date >= month_start)
        .all()
    )
    month_income = round(sum(t.amount for t in txs if t.type == "income"), 2)
    month_expense = round(sum(t.amount for t in txs if t.type == "expense"), 2)

    grouped = (
        db.query(models.Transaction.category, func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == user.id,
            models.Transaction.date >= month_start,
            models.Transaction.type == "expense",
        )
        .group_by(models.Transaction.category)
        .all()
    )
    by_category = [
        CategoryTotal(category=cat, total=round(float(total or 0.0), 2))
        for cat, total in sorted(grouped, key=lambda r: float(r[1] or 0.0), reverse=True)
    ]

    return FinanceSummary(
        total_balance=total_balance,
        month_income=month_income,
        month_expense=month_expense,
        by_category=by_category,
    )
