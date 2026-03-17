from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..core.dependencies import get_current_user
from ..models import User as UserModel
from .dashboard_state import get_notifications, get_support_tickets, get_ticket_messages, iso_now

router = APIRouter()


def _seed_tickets(current_user: UserModel):
    tickets = get_support_tickets(current_user.id)
    if not tickets:
        ticket_id = f"TKT-{uuid.uuid4().hex[:6].upper()}"
        tickets.append({
            "id": ticket_id,
            "subject": "Welcome ticket",
            "description": "Reach out here if you need help with your Zank account.",
            "priority": "low",
            "status": "resolved",
            "created_at": iso_now(),
            "attachment_name": "",
        })
        get_ticket_messages(ticket_id).extend([
            {"id": f"msg_{uuid.uuid4().hex[:8]}", "sender": "agent", "message": "Welcome to Zank support.", "timestamp": iso_now()},
        ])
    return tickets


@router.get("/tickets")
def get_tickets(current_user: UserModel = Depends(get_current_user)):
    tickets = _seed_tickets(current_user)
    return {
        "tickets": [
            {
                **ticket,
                "messages": get_ticket_messages(ticket["id"]),
            }
            for ticket in sorted(tickets, key=lambda entry: entry["created_at"], reverse=True)
        ]
    }


@router.post("/tickets")
async def create_ticket(
    subject: str = Form(...),
    description: str = Form(...),
    priority: str = Form(...),
    attachment: UploadFile | None = File(None),
    current_user: UserModel = Depends(get_current_user),
):
    if len(subject.strip()) < 5 or len(subject.strip()) > 100:
        raise HTTPException(status_code=400, detail="Ticket subject must be 5-100 characters")
    if len(description.strip()) < 20 or len(description.strip()) > 500:
        raise HTTPException(status_code=400, detail="Ticket description must be 20-500 characters")

    attachment_name = ""
    if attachment:
        content = await attachment.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Upload failed, try again")
        attachment_name = attachment.filename or ""

    ticket_id = f"TKT-{uuid.uuid4().hex[:6].upper()}"
    ticket = {
        "id": ticket_id,
        "subject": subject.strip(),
        "description": description.strip(),
        "priority": priority.lower(),
        "status": "open",
        "created_at": iso_now(),
        "attachment_name": attachment_name,
    }
    get_support_tickets(current_user.id).insert(0, ticket)
    get_ticket_messages(ticket_id).append({
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "sender": "user",
        "message": description.strip(),
        "timestamp": iso_now(),
    })
    get_notifications(current_user.id).insert(0, {
        "id": f"notif_ticket_{datetime.utcnow().timestamp()}",
        "type": "support",
        "title": "Support ticket created",
        "message": f"Ticket {ticket_id} has been opened.",
        "timestamp": iso_now(),
        "read": False,
    })
    return {"success": True, "ticket": {**ticket, "messages": get_ticket_messages(ticket_id)}}


@router.post("/chat")
async def send_chat(
    message: str = Form(...),
    ticket_id: str = Form(...),
    attachment: UploadFile | None = File(None),
    current_user: UserModel = Depends(get_current_user),
):
    if not message.strip() or len(message.strip()) > 1000:
        raise HTTPException(status_code=400, detail="Chat message must be between 1 and 1000 characters")
    ticket = next((item for item in _seed_tickets(current_user) if item["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    attachment_name = ""
    if attachment:
        content = await attachment.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Upload failed, try again")
        attachment_name = attachment.filename or ""

    messages = get_ticket_messages(ticket_id)
    user_message = {
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "sender": "user",
        "message": message.strip(),
        "timestamp": iso_now(),
        "attachment_name": attachment_name,
    }
    agent_message = {
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "sender": "agent",
        "message": "Support received your message and will follow up shortly.",
        "timestamp": iso_now(),
    }
    messages.extend([user_message, agent_message])
    ticket["status"] = "in_progress" if ticket["status"] == "open" else ticket["status"]
    return {"success": True, "messages": messages}
