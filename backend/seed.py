"""
Seed script: 500 realistic Indian customers with 6 months of purchase history.
Run with: python seed.py
"""
import os
import random
import sys
from datetime import datetime, timedelta
from faker import Faker
from dotenv import load_dotenv

load_dotenv()

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine, Base
from models import Customer, Order, ChannelEnum

fake = Faker("en_IN")
random.seed(42)

# Indian product catalog
PRODUCTS = [
    "Masala Chai Kit", "Cold Brew Coffee", "Filter Coffee Powder",
    "Green Tea Set", "Herbal Infusion Pack", "Darjeeling First Flush",
    "Assam Gold Tea", "Kashmiri Kahwa", "Coffee Subscription Box",
    "Matcha Latte Mix", "Turmeric Latte", "Cardamom Coffee Blend",
    "Monsoon Malabar Coffee", "Nilgiri Black Tea", "Tulsi Green Tea",
    "Rose Chai", "Chamomile Sleep Tea", "Ginger Lemon Honey Tea",
    "Blue Pea Flower Tea", "Immunity Boost Blend",
    "BrewCo Premium Mug", "French Press Kit", "Pour Over Set",
    "Coffee Grinder", "Tea Infuser", "Cold Brew Bottle",
    "Gift Hamper - Tea Lovers", "Gift Hamper - Coffee Lovers",
    "Travel Kit - Coffee", "Tasting Box Sampler",
]

CHANNELS = ["whatsapp", "email", "sms", "rcs"]
CHANNEL_WEIGHTS = [0.45, 0.30, 0.15, 0.10]

# Indian first names
FIRST_NAMES = [
    "Aditya", "Akash", "Amit", "Ananya", "Arjun", "Aryan", "Ashish",
    "Ayesha", "Deepika", "Dhruv", "Divya", "Gaurav", "Ishaan", "Kavya",
    "Kiran", "Lakshmi", "Manish", "Meera", "Mihir", "Naina", "Neha",
    "Nikhil", "Pallavi", "Pooja", "Priya", "Rahul", "Raj", "Ramesh",
    "Riya", "Rohit", "Sahil", "Sanaya", "Sanjay", "Sara", "Shreya",
    "Siddharth", "Simran", "Sneha", "Suresh", "Tanvi", "Varun",
    "Vikram", "Viraj", "Vishal", "Yash", "Zara", "Zoya", "Kabir",
    "Kriti", "Lavanya", "Madhuri", "Nalini", "Omkar", "Pankaj",
    "Radhika", "Sagar", "Tara", "Uday", "Vandana", "Waris",
]

LAST_NAMES = [
    "Agarwal", "Bhat", "Chandra", "Desai", "Gandhi", "Gupta", "Iyer",
    "Jain", "Joshi", "Kapoor", "Khan", "Kumar", "Mehta", "Mishra",
    "Nair", "Pandey", "Patel", "Pillai", "Rao", "Reddy", "Sharma",
    "Singh", "Sinha", "Trivedi", "Verma",
]

CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata",
    "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Kochi",
    "Indore", "Bhopal", "Nagpur", "Surat", "Vadodara", "Coimbatore",
]


def random_indian_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_indian_phone():
    prefix = random.choice(["98", "97", "96", "95", "94", "93", "91", "90", "89", "88", "87", "86", "85", "84", "83", "82", "81", "80", "79", "78", "77", "76", "75", "74", "73", "72", "70"])
    return f"+91 {prefix}{random.randint(10000000, 99999999)}"


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing = db.query(Customer).count()
        if existing >= 400:
            print(f"Database already has {existing} customers. Skipping seed.")
            return

        print("Seeding 500 Indian customers with purchase history...")

        customers_created = []
        used_emails = set()

        for i in range(500):
            name = random_indian_name()
            email_base = name.lower().replace(" ", ".") + str(random.randint(1, 999))
            email = f"{email_base}@{random.choice(['gmail.com', 'yahoo.in', 'outlook.com', 'hotmail.com', 'icloud.com'])}"

            # Ensure unique email
            counter = 0
            while email in used_emails:
                email = f"{email_base}{counter}@gmail.com"
                counter += 1
            used_emails.add(email)

            phone = random_indian_phone()
            channel = random.choices(CHANNELS, weights=CHANNEL_WEIGHTS)[0]

            # Spend profile: low (₹200-2000), mid (₹2000-8000), high (₹8000-15000)
            tier = random.choices(["low", "mid", "high"], weights=[0.4, 0.4, 0.2])[0]
            if tier == "low":
                total_spent = random.uniform(200, 2000)
                num_orders = random.randint(1, 5)
            elif tier == "mid":
                total_spent = random.uniform(2000, 8000)
                num_orders = random.randint(3, 15)
            else:
                total_spent = random.uniform(8000, 15000)
                num_orders = random.randint(8, 30)

            # Last purchase date: varied, some recent, some inactive
            days_ago = random.choices(
                [random.randint(1, 30), random.randint(31, 90), random.randint(91, 180)],
                weights=[0.4, 0.35, 0.25]
            )[0]
            last_purchase = datetime.utcnow() - timedelta(days=days_ago)

            customer = Customer(
                name=name,
                email=email,
                phone=phone,
                channel_preference=channel,
                total_spent=round(total_spent, 2),
                last_purchase_date=last_purchase,
                created_at=datetime.utcnow() - timedelta(days=random.randint(180, 365)),
            )
            db.add(customer)
            db.flush()

            # Create orders spread over 6 months
            order_total = 0
            for j in range(num_orders):
                order_days_ago = random.randint(days_ago, 180)
                order_date = datetime.utcnow() - timedelta(days=order_days_ago)
                amount = total_spent / num_orders * random.uniform(0.6, 1.4)
                amount = round(min(max(amount, 150), 5000), 2)
                order_total += amount

                order = Order(
                    customer_id=customer.id,
                    amount=amount,
                    product_name=random.choice(PRODUCTS),
                    purchased_at=order_date,
                )
                db.add(order)

            customers_created.append(customer)

            if (i + 1) % 50 == 0:
                db.commit()
                print(f"  Created {i + 1} customers...")

        db.commit()
        print(f"\n✅ Seeded {len(customers_created)} customers successfully!")

        # Print summary
        total = db.query(Customer).count()
        print(f"Total customers in DB: {total}")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
