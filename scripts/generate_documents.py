#!/usr/bin/env python3
"""
Generate synthetic OCR test documents for DonateMate.
Creates realistic-looking donation receipts, acknowledgment letters, bank statements, etc.
"""

import os
import json
import random
from datetime import datetime, timedelta
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import textwrap

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'documents')
MANIFEST_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'manifest.json')

# Organizations data
ORGANIZATIONS = [
    {"name": "Goodwill Industries", "ein": "53-0196517", "short": "goodwill"},
    {"name": "The Salvation Army", "ein": "13-5562351", "short": "salvation-army"},
    {"name": "American Red Cross", "ein": "53-0196605", "short": "redcross"},
    {"name": "Habitat for Humanity", "ein": "91-1914868", "short": "habitat"},
    {"name": "United Way Worldwide", "ein": "13-1635294", "short": "unitedway"},
    {"name": "Community Food Bank", "ein": "12-3456789", "short": "foodbank"},
    {"name": "First Community Church", "ein": "23-4567890", "short": "church"},
    {"name": "State University Foundation", "ein": "34-5678901", "short": "university"},
]

BANKS = [
    {"name": "Chase Bank", "short": "chase"},
    {"name": "Bank of America", "short": "bofa"},
    {"name": "Wells Fargo", "short": "wellsfargo"},
    {"name": "Citibank", "short": "citi"},
    {"name": "Local Credit Union", "short": "creditunion"},
]

QUALITY_SETTINGS = {
    "high": {"blur": 0, "noise": 0, "rotation": 0},
    "medium": {"blur": 0.5, "noise": 10, "rotation": 0},
    "low": {"blur": 1.5, "noise": 25, "rotation": 0},
    "edge": {"blur": 0.8, "noise": 15, "rotation": random.randint(5, 15)},
}

def get_font(size=16, bold=False):
    """Get a font, falling back to default if needed."""
    try:
        if bold:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
    except:
        return ImageFont.load_default()

def add_watermark(img):
    """Add SAMPLE watermark to image."""
    draw = ImageDraw.Draw(img)
    font = get_font(24)
    watermark = "SAMPLE - FOR TESTING ONLY"
    # Add diagonal watermark
    draw.text((img.width // 4, img.height // 2), watermark, fill=(200, 200, 200, 128), font=font)
    return img

def apply_quality(img, quality):
    """Apply quality degradation to image."""
    settings = QUALITY_SETTINGS.get(quality, QUALITY_SETTINGS["high"])
    
    # Apply blur
    if settings["blur"] > 0:
        img = img.filter(ImageFilter.GaussianBlur(settings["blur"]))
    
    # Apply noise
    if settings["noise"] > 0:
        pixels = img.load()
        for i in range(img.width):
            for j in range(img.height):
                if random.random() < 0.1:
                    noise = random.randint(-settings["noise"], settings["noise"])
                    r, g, b = pixels[i, j][:3]
                    pixels[i, j] = (
                        max(0, min(255, r + noise)),
                        max(0, min(255, g + noise)),
                        max(0, min(255, b + noise))
                    )
    
    # Apply rotation
    if settings["rotation"] > 0:
        angle = random.choice([-1, 1]) * settings["rotation"]
        img = img.rotate(angle, fillcolor=(255, 255, 255), expand=True)
    
    return img

def random_date(start_year=2025):
    """Generate random date between start_year and now."""
    start = datetime(start_year, 1, 1)
    end = datetime(2026, 1, 29)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return start + timedelta(days=random_days)

def random_amount(min_amt=25, max_amt=5000):
    """Generate random donation amount."""
    return round(random.uniform(min_amt, max_amt), 2)

def generate_receipt(org, quality, index, manifest_entries):
    """Generate a donation receipt image."""
    # Create image
    width, height = 600, 800
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    # Fonts
    title_font = get_font(24, bold=True)
    header_font = get_font(18, bold=True)
    normal_font = get_font(14)
    small_font = get_font(12)
    
    y = 40
    
    # Organization header
    draw.rectangle([(20, 20), (width-20, 100)], outline='black', width=2)
    draw.text((width//2, 40), org["name"], fill='black', font=title_font, anchor='mt')
    draw.text((width//2, 70), f"EIN: {org['ein']}", fill='gray', font=small_font, anchor='mt')
    
    y = 130
    
    # Receipt title
    draw.text((width//2, y), "DONATION RECEIPT", fill='black', font=header_font, anchor='mt')
    y += 50
    
    # Generate data
    date = random_date()
    amount = random_amount()
    receipt_num = f"RCP-{date.year}-{random.randint(10000, 99999)}"
    
    # Receipt details
    draw.text((40, y), f"Receipt Number: {receipt_num}", fill='black', font=normal_font)
    y += 30
    draw.text((40, y), f"Date: {date.strftime('%B %d, %Y')}", fill='black', font=normal_font)
    y += 50
    
    # Donor info
    draw.text((40, y), "Received From:", fill='black', font=header_font)
    y += 30
    draw.text((60, y), "Test Donor", fill='black', font=normal_font)
    y += 25
    draw.text((60, y), "123 Test Street", fill='black', font=normal_font)
    y += 25
    draw.text((60, y), "Test City, ST 12345", fill='black', font=normal_font)
    y += 50
    
    # Donation amount
    draw.rectangle([(40, y), (width-40, y+60)], outline='black', width=1)
    draw.text((width//2, y+10), "DONATION AMOUNT", fill='black', font=small_font, anchor='mt')
    draw.text((width//2, y+35), f"${amount:,.2f}", fill='black', font=title_font, anchor='mt')
    y += 90
    
    # Tax statement
    tax_text = "No goods or services were provided in exchange for this donation. This receipt may be used for tax purposes."
    wrapped = textwrap.wrap(tax_text, width=60)
    for line in wrapped:
        draw.text((40, y), line, fill='gray', font=small_font)
        y += 20
    
    y += 30
    
    # Signature line
    draw.line([(40, y+40), (250, y+40)], fill='black', width=1)
    draw.text((40, y+45), "Authorized Signature", fill='gray', font=small_font)
    
    # Footer
    draw.text((width//2, height-40), "Thank you for your generous donation!", fill='black', font=normal_font, anchor='mt')
    
    # Add watermark and apply quality
    img = add_watermark(img)
    img = apply_quality(img, quality)
    
    # Save
    filename = f"receipt_{org['short']}_{quality}_{index:03d}.png"
    filepath = os.path.join(OUTPUT_DIR, 'receipts', filename)
    img.save(filepath)
    
    # Add to manifest
    manifest_entries.append({
        "filename": f"receipts/{filename}",
        "documentType": "receipt",
        "quality": quality,
        "synthetic": True,
        "expectedFields": {
            "organization_name": org["name"],
            "ein": org["ein"],
            "amount": amount,
            "date": date.strftime("%Y-%m-%d"),
            "donor_name": "Test Donor",
            "receipt_number": receipt_num
        }
    })
    
    return filename

def generate_acknowledgment_letter(org, quality, index, manifest_entries):
    """Generate an acknowledgment letter image."""
    width, height = 600, 850
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    title_font = get_font(20, bold=True)
    header_font = get_font(16, bold=True)
    normal_font = get_font(12)
    small_font = get_font(10)
    
    y = 40
    
    # Letterhead
    draw.text((width//2, y), org["name"], fill='black', font=title_font, anchor='mt')
    y += 30
    draw.text((width//2, y), "123 Charity Lane, Nonprofit City, ST 00000", fill='gray', font=small_font, anchor='mt')
    y += 20
    draw.text((width//2, y), f"Tax ID: {org['ein']}", fill='gray', font=small_font, anchor='mt')
    y += 10
    draw.line([(40, y+10), (width-40, y+10)], fill='gray', width=1)
    y += 40
    
    # Date
    date = random_date()
    draw.text((40, y), date.strftime("%B %d, %Y"), fill='black', font=normal_font)
    y += 40
    
    # Recipient
    draw.text((40, y), "Test Donor", fill='black', font=normal_font)
    y += 20
    draw.text((40, y), "123 Test Street", fill='black', font=normal_font)
    y += 20
    draw.text((40, y), "Test City, ST 12345", fill='black', font=normal_font)
    y += 40
    
    # Greeting
    draw.text((40, y), "Dear Test Donor,", fill='black', font=normal_font)
    y += 35
    
    # Body
    amount = random_amount()
    donation_date = date - timedelta(days=random.randint(1, 14))
    
    body = f"Thank you for your generous donation of ${amount:,.2f} received on {donation_date.strftime('%B %d, %Y')}. Your support helps us continue our mission to serve the community."
    wrapped = textwrap.wrap(body, width=70)
    for line in wrapped:
        draw.text((40, y), line, fill='black', font=normal_font)
        y += 20
    
    y += 25
    
    # Tax statement
    tax_text = "This letter serves as your official receipt for tax purposes. No goods or services were provided in exchange for your contribution. Please retain this letter for your tax records."
    wrapped = textwrap.wrap(tax_text, width=70)
    for line in wrapped:
        draw.text((40, y), line, fill='black', font=normal_font)
        y += 20
    
    y += 30
    
    # Donation details box
    draw.rectangle([(40, y), (width-40, y+80)], outline='gray', width=1)
    draw.text((50, y+10), "Donation Details:", fill='black', font=header_font)
    draw.text((50, y+35), f"Amount: ${amount:,.2f}", fill='black', font=normal_font)
    draw.text((50, y+55), f"Date Received: {donation_date.strftime('%Y-%m-%d')}", fill='black', font=normal_font)
    draw.text((300, y+35), "Type: Cash/Check", fill='black', font=normal_font)
    y += 110
    
    # Closing
    draw.text((40, y), "With gratitude,", fill='black', font=normal_font)
    y += 50
    draw.line([(40, y), (200, y)], fill='black', width=1)
    y += 5
    draw.text((40, y), "Executive Director", fill='black', font=small_font)
    y += 15
    draw.text((40, y), org["name"], fill='black', font=small_font)
    
    img = add_watermark(img)
    img = apply_quality(img, quality)
    
    filename = f"acknowledgment_{org['short']}_{quality}_{index:03d}.png"
    filepath = os.path.join(OUTPUT_DIR, 'acknowledgment_letters', filename)
    img.save(filepath)
    
    manifest_entries.append({
        "filename": f"acknowledgment_letters/{filename}",
        "documentType": "acknowledgment_letter",
        "quality": quality,
        "synthetic": True,
        "expectedFields": {
            "organization_name": org["name"],
            "ein": org["ein"],
            "amount": amount,
            "date": donation_date.strftime("%Y-%m-%d"),
            "donor_name": "Test Donor"
        }
    })
    
    return filename

def generate_bank_statement(bank, quality, index, manifest_entries):
    """Generate a bank statement excerpt image."""
    width, height = 700, 600
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    title_font = get_font(22, bold=True)
    header_font = get_font(14, bold=True)
    normal_font = get_font(11)
    small_font = get_font(10)
    
    y = 30
    
    # Bank header
    draw.rectangle([(0, 0), (width, 80)], fill='#003366')
    draw.text((30, 25), bank["name"], fill='white', font=title_font)
    draw.text((30, 55), "Account Statement", fill='#cccccc', font=small_font)
    y = 100
    
    # Account info
    acct_num = f"***{random.randint(1000, 9999)}"
    start_date = random_date()
    end_date = start_date + timedelta(days=30)
    
    draw.text((30, y), f"Account: {acct_num}", fill='black', font=normal_font)
    draw.text((400, y), f"Statement Period:", fill='black', font=normal_font)
    y += 20
    draw.text((30, y), "Primary Checking", fill='gray', font=small_font)
    draw.text((400, y), f"{start_date.strftime('%m/%d/%Y')} - {end_date.strftime('%m/%d/%Y')}", fill='black', font=small_font)
    y += 40
    
    # Transaction header
    draw.rectangle([(20, y), (width-20, y+25)], fill='#f0f0f0')
    draw.text((30, y+5), "Date", fill='black', font=header_font)
    draw.text((120, y+5), "Description", fill='black', font=header_font)
    draw.text((450, y+5), "Amount", fill='black', font=header_font)
    draw.text((550, y+5), "Balance", fill='black', font=header_font)
    y += 30
    
    # Generate transactions
    transactions = []
    balance = random.uniform(5000, 15000)
    current_date = start_date
    
    # Add some regular transactions
    for _ in range(random.randint(3, 5)):
        amt = -random.uniform(20, 200)
        balance += amt
        transactions.append({
            "date": current_date,
            "desc": random.choice(["GROCERY STORE", "GAS STATION", "RESTAURANT", "ONLINE PURCHASE"]),
            "amount": amt,
            "balance": balance,
            "charitable": False
        })
        current_date += timedelta(days=random.randint(1, 5))
    
    # Add charitable transactions
    charitable_orgs = random.sample(ORGANIZATIONS, random.randint(2, 3))
    for org in charitable_orgs:
        amt = -random_amount(50, 500)
        balance += amt
        transactions.append({
            "date": current_date,
            "desc": f"DONATION {org['name'][:20].upper()}",
            "amount": amt,
            "balance": balance,
            "charitable": True,
            "org": org
        })
        current_date += timedelta(days=random.randint(1, 5))
    
    # Sort by date
    transactions.sort(key=lambda x: x["date"])
    
    # Draw transactions
    charitable_entries = []
    for txn in transactions:
        if y > height - 80:
            break
        draw.text((30, y), txn["date"].strftime("%m/%d"), fill='black', font=normal_font)
        draw.text((120, y), txn["desc"][:35], fill='black', font=normal_font)
        color = 'red' if txn["amount"] < 0 else 'green'
        draw.text((450, y), f"${txn['amount']:,.2f}", fill=color, font=normal_font)
        draw.text((550, y), f"${txn['balance']:,.2f}", fill='black', font=normal_font)
        y += 22
        
        if txn["charitable"]:
            charitable_entries.append({
                "organization": txn["org"]["name"],
                "amount": abs(txn["amount"]),
                "date": txn["date"].strftime("%Y-%m-%d")
            })
    
    # Footer
    draw.line([(20, height-50), (width-20, height-50)], fill='gray', width=1)
    draw.text((30, height-40), "Page 1 of 1", fill='gray', font=small_font)
    
    img = add_watermark(img)
    img = apply_quality(img, quality)
    
    filename = f"bank_statement_{bank['short']}_{quality}_{index:03d}.png"
    filepath = os.path.join(OUTPUT_DIR, 'bank_statements', filename)
    img.save(filepath)
    
    manifest_entries.append({
        "filename": f"bank_statements/{filename}",
        "documentType": "bank_statement",
        "quality": quality,
        "synthetic": True,
        "expectedFields": {
            "bank_name": bank["name"],
            "account_number": acct_num,
            "statement_period_start": start_date.strftime("%Y-%m-%d"),
            "statement_period_end": end_date.strftime("%Y-%m-%d"),
            "charitable_transactions": charitable_entries
        }
    })
    
    return filename

def main():
    """Generate all test documents."""
    print("Generating OCR test documents...")
    
    # Ensure directories exist
    for subdir in ['receipts', 'acknowledgment_letters', 'bank_statements', 
                   'credit_card_statements', 'cancelled_checks', 'appraisals', 
                   'form_8283', 'other']:
        os.makedirs(os.path.join(OUTPUT_DIR, subdir), exist_ok=True)
    
    manifest_entries = []
    
    # Generate receipts (30 total)
    # 12 high, 9 medium, 6 low, 3 edge
    print("Generating receipts...")
    receipt_count = 0
    for i, quality in enumerate(['high'] * 12 + ['medium'] * 9 + ['low'] * 6 + ['edge'] * 3):
        org = ORGANIZATIONS[i % len(ORGANIZATIONS)]
        generate_receipt(org, quality, receipt_count + 1, manifest_entries)
        receipt_count += 1
    print(f"  Generated {receipt_count} receipts")
    
    # Generate acknowledgment letters (20 total)
    print("Generating acknowledgment letters...")
    letter_count = 0
    for i, quality in enumerate(['high'] * 10 + ['medium'] * 6 + ['low'] * 4):
        org = ORGANIZATIONS[i % len(ORGANIZATIONS)]
        generate_acknowledgment_letter(org, quality, letter_count + 1, manifest_entries)
        letter_count += 1
    print(f"  Generated {letter_count} acknowledgment letters")
    
    # Generate bank statements (15 total)
    print("Generating bank statements...")
    statement_count = 0
    for i, quality in enumerate(['high'] * 8 + ['medium'] * 5 + ['low'] * 2):
        bank = BANKS[i % len(BANKS)]
        generate_bank_statement(bank, quality, statement_count + 1, manifest_entries)
        statement_count += 1
    print(f"  Generated {statement_count} bank statements")
    
    # Create manifest
    manifest = {
        "version": "1.0.0",
        "generatedBy": "claude-synthetic",
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "totalDocuments": len(manifest_entries),
        "documentCounts": {
            "receipts": receipt_count,
            "acknowledgment_letters": letter_count,
            "bank_statements": statement_count
        },
        "documents": manifest_entries
    }
    
    with open(MANIFEST_PATH, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\nGenerated {len(manifest_entries)} total documents")
    print(f"Manifest saved to {MANIFEST_PATH}")

if __name__ == "__main__":
    main()
