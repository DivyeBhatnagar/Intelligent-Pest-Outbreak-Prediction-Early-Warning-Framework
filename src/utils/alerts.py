"""
Automated Multi-Channel Alert & Advisory Notification Service.

Supports:
- Email Dispatch (SMTP or Mocked In-Memory for testing)
- SMS Dispatch (Twilio REST API or local simulated dispatch)
- Formats official ICAR & TNAU prescriptive advisories into actionable warning messages.
"""

from typing import Dict, Any, List, Optional
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from src.utils.logger import get_logger

log = get_logger("services.alerts")


class AlertNotificationService:
    """
    Coordinates early warning alerts across SMS and Email channels when
    micro-climatic risk scores cross HIGH (>= 0.60) or CRITICAL (>= 0.80).
    """

    def __init__(
        self,
        smtp_host: Optional[str] = None,
        smtp_port: int = 587,
        smtp_user: Optional[str] = None,
        smtp_pass: Optional[str] = None,
        twilio_account_sid: Optional[str] = None,
        twilio_auth_token: Optional[str] = None,
        twilio_from_number: Optional[str] = None,
    ):
        self.smtp_host = smtp_host or os.getenv("SMTP_HOST")
        self.smtp_port = int(os.getenv("SMTP_PORT", smtp_port))
        self.smtp_user = smtp_user or os.getenv("SMTP_USER")
        self.smtp_pass = smtp_pass or os.getenv("SMTP_PASS")
        self.twilio_account_sid = twilio_account_sid or os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = twilio_auth_token or os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_from_number = twilio_from_number or os.getenv("TWILIO_FROM_NUMBER")
        
        # Local audit log of all generated alert transmissions
        self.sent_alerts_log: List[Dict[str, Any]] = []

    def format_alert_message(self, alert_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Formats alert payload into concise SMS and detailed HTML/plain-text email.
        """
        crop = alert_data.get("crop", "Unknown Crop")
        pest = alert_data.get("pest_name", "Pest")
        loc = alert_data.get("location", "Field Station")
        score = alert_data.get("risk_score", 0.0)
        level = alert_data.get("risk_level", "ALERT")
        advisory = alert_data.get("advisory", "Inspect fields immediately.")
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

        # 1. SMS text (Concise, strictly < 160 chars)
        sms_body = (
            f"AGRI-ALERT [{level}]: {pest} outbreak threat at {loc} ({crop}). "
            f"Risk: {int(score*100)}%. Advisory: {advisory[:60]}... Act immediately."
        )

        # 2. Detailed Email HTML
        email_subject = f"🚨 [{level} OUTBREAK WARNING] {pest} Risk ({int(score*100)}%) — {loc}"
        email_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="background-color: {'#dc2626' if level == 'CRITICAL' else '#ea580c'}; padding: 20px; color: white; text-align: center;">
              <h2 style="margin: 0;">🌾 Early Warning Alert Notification</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">ICAR & TNAU Agrometeorological Surveillance Engine</p>
            </div>
            <div style="padding: 24px;">
              <p>An automated surveillance threshold trigger occurred on <strong>{timestamp}</strong>:</p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Location / Station:</td><td>{loc}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Target Crop:</td><td>{crop}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Pest Insect:</td><td>{pest}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Calculated Risk Score:</td><td style="color: red; font-weight: bold;">{score:.2f} ({level})</td></tr>
              </table>
              <div style="background-color: #f1f5f9; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 4px;">
                <h4 style="margin: 0 0 6px 0; color: #0369a1;">📋 Prescriptive Agricultural Advisory:</h4>
                <p style="margin: 0; font-size: 0.95em; line-height: 1.5;">{advisory}</p>
              </div>
              <p style="font-size: 0.85em; color: #64748b; margin-top: 24px; text-align: center;">
                Intelligent Pest Outbreak Prediction & Early Warning Framework
              </p>
            </div>
          </div>
        </body>
        </html>
        """

        return {
            "sms": sms_body,
            "email_subject": email_subject,
            "email_html": email_html,
        }

    def send_alert(
        self,
        alert_data: Dict[str, Any],
        recipient_email: Optional[str] = None,
        recipient_phone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches alert across configured channels or logs to audit trace.
        """
        messages = self.format_alert_message(alert_data)
        dispatch_status = {
            "timestamp": datetime.utcnow().isoformat(),
            "email_sent": False,
            "sms_sent": False,
            "recipient_email": recipient_email,
            "recipient_phone": recipient_phone,
            "simulated": False,
        }

        # 1. Email Dispatch
        if recipient_email:
            if self.smtp_host and self.smtp_user and self.smtp_pass:
                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = messages["email_subject"]
                    msg["From"] = self.smtp_user
                    msg["To"] = recipient_email
                    msg.attach(MIMEText(messages["email_html"], "html"))

                    with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                        server.starttls()
                        server.login(self.smtp_user, self.smtp_pass)
                        server.sendmail(self.smtp_user, recipient_email, msg.as_string())
                    dispatch_status["email_sent"] = True
                    log.info(f"Dispatched SMTP alert email to {recipient_email}")
                except Exception as e:
                    log.error(f"Failed to send email via SMTP: {e}")
            else:
                # Simulated dispatch mode for local development/testing
                dispatch_status["email_sent"] = True
                dispatch_status["simulated"] = True
                log.info(f"[SIMULATED EMAIL] To: {recipient_email} | Subject: {messages['email_subject']}")

        # 2. SMS Dispatch (Twilio REST or Simulated)
        if recipient_phone:
            if self.twilio_account_sid and self.twilio_auth_token and self.twilio_from_number:
                try:
                    import httpx
                    url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_account_sid}/Messages.json"
                    data = {
                        "From": self.twilio_from_number,
                        "To": recipient_phone,
                        "Body": messages["sms"],
                    }
                    r = httpx.post(url, data=data, auth=(self.twilio_account_sid, self.twilio_auth_token), timeout=5.0)
                    if r.status_code in [200, 201]:
                        dispatch_status["sms_sent"] = True
                        log.info(f"Dispatched Twilio SMS alert to {recipient_phone}")
                    else:
                        log.error(f"Twilio error ({r.status_code}): {r.text}")
                except Exception as e:
                    log.error(f"Failed to send SMS via Twilio: {e}")
            else:
                dispatch_status["sms_sent"] = True
                dispatch_status["simulated"] = True
                log.info(f"[SIMULATED SMS] To: {recipient_phone} | Body: {messages['sms']}")

        self.sent_alerts_log.append({**dispatch_status, **alert_data})
        return dispatch_status


# Global alert service singleton instance
alert_service = AlertNotificationService()
