import uuid
import secrets
from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.rbac.models import Role, Permission, TenantMembership
from apps.rbac.services import RBACService
from apps.staff.models import StaffProfile
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.models import Order, OrderItem
from apps.kitchen.models import KitchenTicket
from apps.billing.models import TaxRule, Bill, Payment
from apps.inventory.models import (
    InventoryItem,
    UnitOfMeasure,
    ItemType,
    StorageLocation,
    StorageCondition,
    Recipe,
    RecipeItem,
    StockMovement,
)
from apps.procurement.models import (
    Supplier,
    SupplierType,
    PaymentTerms,
    PurchaseOrder,
    PurchaseOrderItem,
)
from apps.customers.models import Customer, CustomerTag, Reservation, ReservationStatus
from apps.loyalty.models import LoyaltyProgram, MembershipTier, LoyaltyAccount, GiftCard
from apps.marketing.models import Promotion, PromotionType, PromotionStatus, Coupon
from apps.finance.models import Account, AccountCategory, NormalBalance, CostCenter, CashSession
from apps.hr.models import Department, Position, Shift, AttendanceSession, AttendanceStatus, LeaveType, LeaveRequest
from apps.notifications.models import Notification, NotificationType, NotificationSeverity


class Command(BaseCommand):
    help = "Seeds comprehensive, high-quality, realistic mock data for all Fluxiflow pages and modules."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE(">> Starting Full Mock Data Seeding for Fluxiflow..."))

        # 1. Seed RBAC Permissions & Roles
        self.stdout.write("- Checking RBAC permissions and system roles...")
        if not Permission.objects.exists() or not Role.objects.exists():
            RBACService.seed_system_roles_and_permissions()

        # 2. Primary Restaurant
        restaurant, _ = Restaurant.objects.update_or_create(
            slug="royal-bistro",
            defaults={
                "name": "The Royal Bistro & Kitchen",
                "legal_name": "Royal Bistro Hospitality LLC",
                "email": "contact@royalbistro.com",
                "phone": "+91 98765 43210",
                "address_line1": "42 Grand Boulevard, Culinary District",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postal_code": "400001",
                "country": "India",
                "currency": "INR",
                "is_active": True,
            },
        )

        # Secondary Restaurant
        Restaurant.objects.update_or_create(
            slug="fluxi-gourmet",
            defaults={
                "name": "Fluxi Gourmet Kitchen",
                "legal_name": "Fluxi Gourmet Foods Pvt Ltd",
                "email": "hq@fluxigourmet.com",
                "currency": "INR",
                "is_active": True,
            },
        )

        # 3. Demo Users & Staff
        self.stdout.write("- Seeding staff profiles and user accounts...")
        demo_users_data = [
            ("admin@fluxiflow.com", "Alexander", "Pierce", "SAAS_OWNER", "Platform Super Admin"),
            ("owner@fluxiflow.com", "Elena", "Rostova", "RESTAURANT_ADMIN", "Managing Partner & Owner"),
            ("manager@fluxiflow.com", "Marcus", "Vance", "MANAGER", "General Operations Manager"),
            ("chef@fluxiflow.com", "Gordon", "Ramsey", "KITCHEN_STAFF", "Executive Head Chef"),
            ("waiter@fluxiflow.com", "Lucas", "Sterling", "WAITER", "Lead Floor Captain"),
            ("cashier@fluxiflow.com", "Chloe", "Bennett", "CASHIER", "Head POS Cashier"),
            ("driver@fluxiflow.com", "Vikram", "Sharma", "WAITER", "Senior Dispatch Courier"),
        ]

        staff_members = {}
        for email, fname, lname, rcode, title in demo_users_data:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": fname,
                    "last_name": lname,
                    "is_active": True,
                    "is_staff": rcode in ("SAAS_OWNER", "RESTAURANT_ADMIN"),
                    "is_superuser": rcode == "SAAS_OWNER",
                },
            )
            user.set_password("password123")
            user.save()

            role = Role.objects.filter(code=rcode).first() or Role.objects.first()
            membership, _ = TenantMembership.objects.get_or_create(
                user=user,
                tenant_id=restaurant.id,
                defaults={"active_role": role, "is_active": True},
            )
            if role:
                membership.assigned_roles.add(role)

            emp_id = f"EMP-{uuid.uuid4().hex[:4].upper()}"
            staff_profile, _ = StaffProfile.objects.update_or_create(
                restaurant=restaurant,
                user=user,
                defaults={
                    "membership": membership,
                    "employee_id": emp_id,
                    "first_name": fname,
                    "last_name": lname,
                    "email": email,
                    "primary_role": role,
                    "status": StaffProfile.StaffStatus.ACTIVE,
                },
            )
            staff_members[email] = staff_profile

        # 4. Tax Rules
        tax_gst, _ = TaxRule.objects.update_or_create(
            restaurant=restaurant,
            name="GST (Goods & Services Tax)",
            defaults={"rate": Decimal("5.00"), "is_active": True},
        )
        tax_service, _ = TaxRule.objects.update_or_create(
            restaurant=restaurant,
            name="Service Charge",
            defaults={"rate": Decimal("5.00"), "is_active": True},
        )

        # 5. Table Floor Plan
        self.stdout.write("- Seeding tables and floor layouts...")
        tables_data = [
            ("T-01", "Main Dining Room", 2, RestaurantTable.TableStatus.OCCUPIED, 1),
            ("T-02", "Main Dining Room", 4, RestaurantTable.TableStatus.OCCUPIED, 2),
            ("T-03", "Main Dining Room", 4, RestaurantTable.TableStatus.AVAILABLE, 3),
            ("T-04", "Main Dining Room", 6, RestaurantTable.TableStatus.RESERVED, 4),
            ("T-05", "Main Dining Room", 4, RestaurantTable.TableStatus.AVAILABLE, 5),
            ("T-06", "Main Dining Room", 8, RestaurantTable.TableStatus.AVAILABLE, 6),
            ("P-01", "Patio Garden", 2, RestaurantTable.TableStatus.OCCUPIED, 7),
            ("P-02", "Patio Garden", 4, RestaurantTable.TableStatus.AVAILABLE, 8),
            ("P-03", "Patio Garden", 4, RestaurantTable.TableStatus.AVAILABLE, 9),
            ("P-04", "Patio Garden", 6, RestaurantTable.TableStatus.AVAILABLE, 10),
            ("B-01", "Bar Lounge", 2, RestaurantTable.TableStatus.OCCUPIED, 11),
            ("B-02", "Bar Lounge", 2, RestaurantTable.TableStatus.AVAILABLE, 12),
            ("B-03", "Bar Lounge", 4, RestaurantTable.TableStatus.AVAILABLE, 13),
            ("VIP-1", "VIP Private Suite", 8, RestaurantTable.TableStatus.OCCUPIED, 14),
            ("VIP-2", "VIP Private Suite", 10, RestaurantTable.TableStatus.RESERVED, 15),
        ]

        tables_map = {}
        for tname, section, cap, status, order_idx in tables_data:
            table, _ = RestaurantTable.objects.update_or_create(
                restaurant=restaurant,
                name=tname,
                defaults={
                    "section": section,
                    "capacity": cap,
                    "status": status,
                    "display_order": order_idx,
                    "is_active": True,
                },
            )
            tables_map[tname] = table

        # 6. Menu Categories & Items
        self.stdout.write("- Seeding menu catalog and culinary items...")
        categories_data = [
            ("Starters & Small Plates", "Artisanal appetizers crafted for sharing", 1),
            ("Steaks & Premium Grills", "Charcoal-grilled prime cuts and fresh seafood", 2),
            ("Handmade Pasta & Risotto", "Fresh pasta rolled daily in our kitchen", 3),
            ("Woodfired Neapolitan Pizza", "Fermented sourdough pizzas baked at 450°C", 4),
            ("Artisan Burgers & Sandwiches", "Gourmet brioche burgers with house relish", 5),
            ("Fresh Garden Sides", "Farm-to-table vegetable accompaniments", 6),
            ("Decadent Desserts", "Handcrafted pastries and artisanal gelato", 7),
            ("Signature Cocktails & Wine", "Curated mixology and sommelier selections", 8),
        ]

        cats_map = {}
        for cname, cdesc, order_idx in categories_data:
            cat, _ = MenuCategory.objects.update_or_create(
                restaurant=restaurant,
                name=cname,
                defaults={"description": cdesc, "display_order": order_idx, "is_active": True},
            )
            cats_map[cname] = cat

        menu_items_data = [
            # Starters
            ("Starters & Small Plates", "Truffle Arancini", "Crispy saffron risotto balls stuffed with smoked mozzarella & black truffle aioli", Decimal("380.00"), 1),
            ("Starters & Small Plates", "Crispy Calamari Fritti", "Tender baby squid tossed with sea salt, crushed peppercorn & spicy garlic dip", Decimal("450.00"), 2),
            ("Starters & Small Plates", "Bruschetta al Pomodoro", "Toasted sourdough, heirloom tomatoes, fresh basil, aged balsamic glaze", Decimal("320.00"), 3),
            ("Starters & Small Plates", "Garlic Butter Tiger Prawns", "Pan-seared jumbo prawns in white wine, chili flakes, and toasted sourdough", Decimal("590.00"), 4),
            # Steaks
            ("Steaks & Premium Grills", "Prime Angus Ribeye (300g)", "28-day dry aged ribeye steak, roasted garlic herb butter, red wine demi-glace", Decimal("1450.00"), 1),
            ("Steaks & Premium Grills", "Filet Mignon Tenderloin", "Grass-fed beef tenderloin with truffle potato puree and glazed baby carrots", Decimal("1650.00"), 2),
            ("Steaks & Premium Grills", "Pan-Seared Atlantic Salmon", "Crispy skin salmon fillet, lemon caper beurre blanc, charred asparagus", Decimal("980.00"), 3),
            ("Steaks & Premium Grills", "Rosemary Lamb Chops", "Char-grilled New Zealand lamb chops with mint chimichurri and baby potatoes", Decimal("1250.00"), 4),
            # Pasta
            ("Handmade Pasta & Risotto", "Wild Mushroom Truffle Risotto", "Creamy carnaroli rice, porcini & cremini mushrooms, 24-month Parmigiano", Decimal("650.00"), 1),
            ("Handmade Pasta & Risotto", "Tagliatelle al Ragu Bolognese", "Slow-braised beef and pork ragu, fresh egg tagliatelle, pecorino romano", Decimal("580.00"), 2),
            ("Handmade Pasta & Risotto", "Lobster & Crab Ravioli", "Handmade pasta parcels in saffron bisque cream with fresh chives", Decimal("890.00"), 3),
            ("Handmade Pasta & Risotto", "Penne all'Arrabbiata", "San Marzano tomato sauce, fresh chili, garlic, extra virgin olive oil", Decimal("460.00"), 4),
            # Pizza
            ("Woodfired Neapolitan Pizza", "Margherita Extra DOP", "San Marzano tomatoes, buffalo mozzarella, fresh basil, EVOO", Decimal("520.00"), 1),
            ("Woodfired Neapolitan Pizza", "Quattro Formaggi", "Gorgonzola dolce, mozzarella, smoked provolone, ricotta, wildflower honey", Decimal("620.00"), 2),
            ("Woodfired Neapolitan Pizza", "Prosciutto e Rucola", "Fior di latte, aged prosciutto di Parma, wild baby rocket, shaved parmesan", Decimal("690.00"), 3),
            ("Woodfired Neapolitan Pizza", "Spicy Pepperoni & Jalapeño", "Cured Italian pepperoni, pickled jalapeños, smoked chili honey", Decimal("640.00"), 4),
            # Burgers
            ("Artisan Burgers & Sandwiches", "The Royal Wagyu Burger", "200g Wagyu beef patty, aged cheddar, caramelized onion jam, brioche bun", Decimal("720.00"), 1),
            ("Artisan Burgers & Sandwiches", "Crispy Buttermilk Chicken Burger", "Southern fried chicken thigh, spicy pickled slaw, garlic herb mayo", Decimal("540.00"), 2),
            ("Artisan Burgers & Sandwiches", "Portobello Truffle Burger (V)", "Grilled portobello mushroom, smoked gouda, arugula, truffle aioli", Decimal("490.00"), 3),
            # Sides
            ("Fresh Garden Sides", "Truffle Parmesan Fries", "Hand-cut Idaho russet potato fries tossed in white truffle oil & parmesan", Decimal("280.00"), 1),
            ("Fresh Garden Sides", "Charred Jumbo Asparagus", "Grilled with sea salt, lemon zest, and extra virgin olive oil", Decimal("320.00"), 2),
            ("Fresh Garden Sides", "Burrata & Heirloom Salad", "Fresh Pugliese burrata, heirloom tomatoes, basil pesto, balsamic caviar", Decimal("480.00"), 3),
            # Desserts
            ("Decadent Desserts", "Classic Italian Tiramisu", "Savoiardi ladyfingers soaked in espresso & Marsala, mascarpone cream", Decimal("380.00"), 1),
            ("Decadent Desserts", "Valrhona Dark Chocolate Fondant", "Warm molten lava cake with bourbon vanilla bean gelato", Decimal("420.00"), 2),
            ("Decadent Desserts", "Sicilian Pistachio Gelato", "House-churned Bronte pistachio gelato with crushed waffle crisp", Decimal("280.00"), 3),
            # Beverages
            ("Signature Cocktails & Wine", "Smoked Rosemary Old Fashioned", "Bourbon whiskey, smoked rosemary, Angostura bitters, orange peel", Decimal("650.00"), 1),
            ("Signature Cocktails & Wine", "Passionfruit Basil Mojito", "White rum, fresh passionfruit pulp, lime juice, fresh garden basil", Decimal("550.00"), 2),
            ("Signature Cocktails & Wine", "Berry Sparkling Mocktail", "Muddled wild berries, sparkling tonic water, fresh mint sprig", Decimal("320.00"), 3),
            ("Signature Cocktails & Wine", "Double Espresso Blend", "100% Arabica artisanal single-origin espresso shot", Decimal("180.00"), 4),
        ]

        menu_items_map = {}
        for cat_name, iname, idesc, iprice, dorder in menu_items_data:
            category = cats_map[cat_name]
            item, _ = MenuItem.objects.update_or_create(
                restaurant=restaurant,
                name=iname,
                defaults={
                    "category": category,
                    "description": idesc,
                    "price": iprice,
                    "is_available": True,
                    "is_active": True,
                    "display_order": dorder,
                },
            )
            menu_items_map[iname] = item

        # 7. Inventory Items & Stock
        self.stdout.write("- Seeding inventory raw ingredients and stock levels...")
        raw_ingredients_data = [
            ("ING-001", "Prime Angus Ribeye Loins", ItemType.RAW_INGREDIENT, UnitOfMeasure.KG, StorageLocation.WALK_IN_FREEZER, StorageCondition.FROZEN, Decimal("45.0"), Decimal("15.0"), Decimal("850.00")),
            ("ING-002", "Wagyu Beef Patties", ItemType.RAW_INGREDIENT, UnitOfMeasure.PIECE, StorageLocation.WALK_IN_FREEZER, StorageCondition.FROZEN, Decimal("80.0"), Decimal("25.0"), Decimal("220.00")),
            ("ING-003", "Fresh Atlantic Salmon Fillet", ItemType.RAW_INGREDIENT, UnitOfMeasure.KG, StorageLocation.WALK_IN_FREEZER, StorageCondition.REFRIGERATED, Decimal("22.5"), Decimal("8.0"), Decimal("650.00")),
            ("ING-004", "Buffalo Mozzarella DOP", ItemType.RAW_INGREDIENT, UnitOfMeasure.KG, StorageLocation.KITCHEN, StorageCondition.REFRIGERATED, Decimal("35.0"), Decimal("10.0"), Decimal("380.00")),
            ("ING-005", "Black Truffle Oil Extra", ItemType.RAW_INGREDIENT, UnitOfMeasure.BOTTLE, StorageLocation.DRY_STORAGE, StorageCondition.AMBIENT, Decimal("18.0"), Decimal("5.0"), Decimal("1200.00")),
            ("ING-006", "Carnaroli Risotto Rice", ItemType.RAW_INGREDIENT, UnitOfMeasure.KG, StorageLocation.DRY_STORAGE, StorageCondition.AMBIENT, Decimal("50.0"), Decimal("15.0"), Decimal("180.00")),
            ("ING-007", "Artisanal Brioche Buns", ItemType.PACKAGING, UnitOfMeasure.PIECE, StorageLocation.MAIN_STORE, StorageCondition.AMBIENT, Decimal("120.0"), Decimal("40.0"), Decimal("25.00")),
            ("ING-008", "Parmigiano Reggiano 24M", ItemType.RAW_INGREDIENT, UnitOfMeasure.KG, StorageLocation.KITCHEN, StorageCondition.REFRIGERATED, Decimal("15.0"), Decimal("4.0"), Decimal("950.00")),
            ("ING-009", "San Marzano Canned Tomatoes", ItemType.RAW_INGREDIENT, UnitOfMeasure.PACK, StorageLocation.DRY_STORAGE, StorageCondition.AMBIENT, Decimal("60.0"), Decimal("20.0"), Decimal("140.00")),
            ("ING-010", "Bourbon Whiskey Reserve", ItemType.FINISHED_GOOD, UnitOfMeasure.BOTTLE, StorageLocation.BAR, StorageCondition.AMBIENT, Decimal("14.0"), Decimal("4.0"), Decimal("2400.00")),
            ("ING-011", "Imported Russet Potatoes", ItemType.RAW_INGREDIENT, UnitOfMeasure.KG, StorageLocation.MAIN_STORE, StorageCondition.AMBIENT, Decimal("150.0"), Decimal("50.0"), Decimal("45.00")),
            ("ING-012", "Single Origin Arabica Beans", ItemType.RAW_INGREDIENT, UnitOfMeasure.KG, StorageLocation.BAR, StorageCondition.AMBIENT, Decimal("20.0"), Decimal("5.0"), Decimal("750.00")),
        ]

        inv_items_map = {}
        for code, iname, itype, uom, loc, cond, on_hand, reorder_pt, ucost in raw_ingredients_data:
            inv_item, _ = InventoryItem.objects.update_or_create(
                restaurant=restaurant,
                name=iname,
                defaults={
                    "sku": code,
                    "item_type": itype,
                    "unit": uom,
                    "purchase_unit": uom,
                    "storage_location": loc,
                    "storage_condition": cond,
                    "current_quantity": on_hand,
                    "minimum_stock_level": reorder_pt,
                    "par_level": reorder_pt * Decimal("3.0"),
                    "max_stock_level": reorder_pt * Decimal("6.0"),
                    "cost_per_unit": ucost,
                    "last_purchase_cost": ucost,
                    "weighted_average_cost": ucost,
                    "is_active": True,
                },
            )
            inv_items_map[code] = inv_item

        # 8. Suppliers & Purchase Orders
        self.stdout.write("- Seeding suppliers and procurement orders...")
        suppliers_data = [
            ("SUP-001", "Sysco Prime Gourmet Meats", SupplierType.PRIMARY_WHOLESALER, "Rajesh Khanna", "orders@syscoprime.in", "+91 98111 22334", PaymentTerms.NET_30),
            ("SUP-002", "Roma Artisanal Italian Imports", SupplierType.SPECIALTY_IMPORTER, "Marco Rossi", "info@roma-imports.com", "+91 98222 33445", PaymentTerms.NET_15),
            ("SUP-003", "Green Valley Organic Hydroponics", SupplierType.LOCAL_PRODUCE, "Sunita Deshmukh", "sales@greenvalley.in", "+91 98333 44556", PaymentTerms.NET_7),
            ("SUP-004", "Ocean Harvest Seafoods Co", SupplierType.PRIMARY_WHOLESALER, "Captain Joseph", "fresh@oceanharvest.in", "+91 98444 55667", PaymentTerms.IMMEDIATE),
            ("SUP-005", "Apex Beverage & Spirits Distro", SupplierType.BEVERAGE_DISTRIBUTOR, "Amitabh Roy", "distro@apexbev.in", "+91 98555 66778", PaymentTerms.NET_30),
        ]

        suppliers_map = {}
        for scode, sname, stype, cperson, semail, sphone, pterms in suppliers_data:
            supplier, _ = Supplier.objects.update_or_create(
                restaurant=restaurant,
                supplier_code=scode,
                defaults={
                    "name": sname,
                    "supplier_type": stype,
                    "contact_person": cperson,
                    "email": semail,
                    "phone": sphone,
                    "payment_terms": pterms,
                    "is_active": True,
                },
            )
            suppliers_map[scode] = supplier

        # Create Purchase Order
        po1, _ = PurchaseOrder.objects.update_or_create(
            restaurant=restaurant,
            po_number="PO-2026-0042",
            defaults={
                "supplier": suppliers_map["SUP-001"],
                "status": PurchaseOrder.POStatus.APPROVED,
                "subtotal": Decimal("25500.00"),
                "tax_amount": Decimal("1275.00"),
                "total_amount": Decimal("26775.00"),
                "created_by": staff_members["manager@fluxiflow.com"].user,
                "approved_by": staff_members["admin@fluxiflow.com"].user,
                "expected_delivery_date": (timezone.now() + timedelta(days=2)).date(),
                "notes": "Weekly prime meat restocking - keep temperature below -18C",
            },
        )

        PurchaseOrderItem.objects.update_or_create(
            purchase_order=po1,
            inventory_item=inv_items_map["ING-001"],
            defaults={
                "item_name_snapshot": inv_items_map["ING-001"].name,
                "quantity_ordered": Decimal("30.0"),
                "unit": UnitOfMeasure.KG,
                "unit_cost": Decimal("850.00"),
                "line_total": Decimal("25500.00"),
            },
        )

        # 9. Customers & CRM
        self.stdout.write("- Seeding customer profiles and dining history...")
        vip_tag, _ = CustomerTag.objects.update_or_create(
            restaurant=restaurant, name="VIP Foodie", defaults={"color": "emerald"}
        )
        reg_tag, _ = CustomerTag.objects.update_or_create(
            restaurant=restaurant, name="Regular Guest", defaults={"color": "blue"}
        )

        customers_data = [
            ("Aarav Mehta", "aarav.mehta@example.com", "+91 98900 11223", Decimal("48500.00"), 14, vip_tag),
            ("Priya Sharma", "priya.sharma@example.com", "+91 98900 22334", Decimal("28200.00"), 8, vip_tag),
            ("Rohan Desai", "rohan.desai@example.com", "+91 98900 33445", Decimal("15400.00"), 5, reg_tag),
            ("Ananya Patel", "ananya.patel@example.com", "+91 98900 44556", Decimal("9800.00"), 3, reg_tag),
        ]

        customers_map = {}
        for cname, cemail, cphone, cspend, cvisits, tag in customers_data:
            first, *last = cname.split(" ")
            cust, _ = Customer.objects.update_or_create(
                restaurant=restaurant,
                email=cemail,
                defaults={
                    "first_name": first,
                    "last_name": " ".join(last),
                    "phone": cphone,
                    "total_spend": cspend,
                    "total_visits": cvisits,
                    "dietary_preferences": ["Medium-rare", "Window seating"] if "Aarav" in cname else ["Nut-free"],
                    "internal_notes": "Valued loyal customer." if "Aarav" in cname else "Regular guest.",
                    "is_active": True,
                },
            )
            cust.tags.add(tag)
            customers_map[cemail] = cust

        # Table Reservation
        Reservation.objects.update_or_create(
            restaurant=restaurant,
            reservation_number="RES-2026-0819-01",
            defaults={
                "customer": customers_map["aarav.mehta@example.com"],
                "table": tables_map["VIP-1"],
                "reservation_date": (timezone.now() + timedelta(hours=3)).date(),
                "reservation_time": (timezone.now() + timedelta(hours=3)).time(),
                "party_size": 4,
                "status": ReservationStatus.CONFIRMED,
                "special_requests": "Anniversary celebration - bottle of vintage red wine on arrival.",
            },
        )

        # 10. Orders & Live Kitchen Tickets
        self.stdout.write("- Seeding live customer orders and KDS tickets...")
        orders_data = [
            ("ORD-00101", tables_map["T-01"], Order.OrderStatus.PLACED, Order.OrderType.DINE_IN, staff_members["waiter@fluxiflow.com"], KitchenTicket.KitchenStatus.PREPARING, [
                ("Prime Angus Ribeye (300g)", 2, Decimal("1450.00"), "Medium rare with extra garlic herb butter"),
                ("Truffle Parmesan Fries", 1, Decimal("280.00"), "Extra crispy"),
                ("Smoked Rosemary Old Fashioned", 2, Decimal("650.00"), "One ice sphere"),
            ]),
            ("ORD-00102", tables_map["T-02"], Order.OrderStatus.PLACED, Order.OrderType.DINE_IN, staff_members["waiter@fluxiflow.com"], KitchenTicket.KitchenStatus.READY, [
                ("Wild Mushroom Truffle Risotto", 1, Decimal("650.00"), "Extra parmesan on the side"),
                ("Pan-Seared Atlantic Salmon", 1, Decimal("980.00"), "Crispy skin, dressing separate"),
                ("Berry Sparkling Mocktail", 2, Decimal("320.00"), None),
            ]),
            ("ORD-00103", tables_map["B-01"], Order.OrderStatus.PLACED, Order.OrderType.DINE_IN, staff_members["cashier@fluxiflow.com"], KitchenTicket.KitchenStatus.NEW, [
                ("The Royal Wagyu Burger", 2, Decimal("720.00"), "No onions on one burger"),
                ("Crispy Calamari Fritti", 1, Decimal("450.00"), "Extra lemon wedges"),
                ("Passionfruit Basil Mojito", 2, Decimal("550.00"), None),
            ]),
            ("ORD-00104", tables_map["VIP-1"], Order.OrderStatus.COMPLETED, Order.OrderType.DINE_IN, staff_members["waiter@fluxiflow.com"], KitchenTicket.KitchenStatus.COMPLETED, [
                ("Filet Mignon Tenderloin", 2, Decimal("1650.00"), "Chef recommendation"),
                ("Lobster & Crab Ravioli", 2, Decimal("890.00"), None),
                ("Classic Italian Tiramisu", 2, Decimal("380.00"), None),
            ]),
        ]

        for onum, otable, ostatus, otype, server, kstatus, items in orders_data:
            subtot = sum(qty * price for _, qty, price, _ in items)
            tax_amt = subtot * Decimal("0.10")
            tot_amt = subtot + tax_amt

            order, _ = Order.objects.update_or_create(
                restaurant=restaurant,
                order_number=onum,
                defaults={
                    "table": otable,
                    "status": ostatus,
                    "order_type": otype,
                    "source": Order.OrderSource.POS,
                    "created_by": server.user,
                    "subtotal": subtot,
                    "total": tot_amt,
                },
            )

            for iname, iqty, iprice, inotes in items:
                menu_item = menu_items_map[iname]
                OrderItem.objects.update_or_create(
                    order=order,
                    menu_item=menu_item,
                    defaults={
                        "item_name_snapshot": menu_item.name,
                        "unit_price_snapshot": iprice,
                        "quantity": iqty,
                        "line_total": iqty * iprice,
                        "notes": inotes or "",
                    },
                )

            # Kitchen Ticket
            KitchenTicket.objects.update_or_create(
                restaurant=restaurant,
                order=order,
                defaults={
                    "status": kstatus,
                    "priority": 1 if "VIP" in (otable.name if otable else "") else 0,
                    "started_at": timezone.now() - timedelta(minutes=12) if kstatus in (KitchenTicket.KitchenStatus.PREPARING, KitchenTicket.KitchenStatus.READY, KitchenTicket.KitchenStatus.COMPLETED) else None,
                    "ready_at": timezone.now() - timedelta(minutes=2) if kstatus in (KitchenTicket.KitchenStatus.READY, KitchenTicket.KitchenStatus.COMPLETED) else None,
                    "completed_at": timezone.now() - timedelta(minutes=1) if kstatus == KitchenTicket.KitchenStatus.COMPLETED else None,
                },
            )

            # If completed, create finalized Bill and Payment
            if ostatus == Order.OrderStatus.COMPLETED:
                bill, _ = Bill.objects.update_or_create(
                    restaurant=restaurant,
                    order=order,
                    defaults={
                        "bill_number": f"BILL-{onum.replace('ORD-', '')}",
                        "status": Bill.BillStatus.PAID,
                        "subtotal": subtot,
                        "tax_amount": tax_amt,
                        "grand_total": tot_amt,
                        "total_paid": tot_amt,
                        "balance_due": Decimal("0.00"),
                        "created_by": server.user,
                    },
                )
                Payment.objects.update_or_create(
                    bill=bill,
                    defaults={
                        "restaurant": restaurant,
                        "amount": tot_amt,
                        "payment_method": Payment.PaymentMethod.CARD,
                        "status": Payment.PaymentStatus.SUCCESS,
                        "reference": f"TXN-{uuid.uuid4().hex[:8].upper()}",
                        "received_by": staff_members["cashier@fluxiflow.com"].user,
                    },
                )

        # 11. Loyalty Program & Gift Cards
        self.stdout.write("- Seeding loyalty rewards and active gift cards...")
        loyalty_prog, _ = LoyaltyProgram.objects.update_or_create(
            restaurant=restaurant,
            defaults={
                "name": "The Royal Gourmet Club",
                "points_enabled": True,
                "earning_rate": Decimal("1.00"),
                "redemption_rate": Decimal("0.0500"),
            },
        )

        tier_gold, _ = MembershipTier.objects.update_or_create(
            restaurant=restaurant,
            name="Gold Epicurean",
            defaults={
                "rank": 2,
                "qualification_spend": Decimal("25000.00"),
                "points_multiplier": Decimal("1.25"),
                "discount_percentage": Decimal("10.00"),
                "is_active": True,
            },
        )

        LoyaltyAccount.objects.update_or_create(
            restaurant=restaurant,
            customer=customers_map["aarav.mehta@example.com"],
            defaults={
                "current_tier": tier_gold,
                "points_balance": 4850,
                "lifetime_points_earned": 6200,
            },
        )

        GiftCard.objects.update_or_create(
            restaurant=restaurant,
            card_number="GIFT-ROYAL-8899",
            defaults={
                "secret_code": "SEC-8899",
                "initial_balance": Decimal("5000.00"),
                "current_balance": Decimal("3500.00"),
                "status": "ACTIVE",
                "expires_at": timezone.now() + timedelta(days=180),
            },
        )

        # 12. Marketing Promotions & Coupons
        self.stdout.write("- Seeding marketing campaigns and discount vouchers...")
        promo1, _ = Promotion.objects.update_or_create(
            restaurant=restaurant,
            name="Twilight Cocktail Happy Hour",
            defaults={
                "description": "20% off all signature cocktails and starters between 5 PM and 8 PM",
                "promotion_type": PromotionType.PERCENTAGE_DISCOUNT,
                "discount_value": Decimal("20.00"),
                "status": PromotionStatus.ACTIVE,
                "start_at": timezone.now() - timedelta(days=10),
                "end_at": timezone.now() + timedelta(days=60),
            },
        )

        Coupon.objects.update_or_create(
            restaurant=restaurant,
            code="HAPPY20",
            defaults={
                "promotion": promo1,
                "status": "ACTIVE",
                "usage_limit": 500,
                "current_usage_count": 48,
                "valid_from": timezone.now() - timedelta(days=10),
                "valid_until": timezone.now() + timedelta(days=60),
            },
        )

        # 13. Financial Chart of Accounts & Cash Drawers
        self.stdout.write("- Seeding financial ledger accounts and drawer sessions...")
        accounts_data = [
            ("1010", "Cash on Hand / Till", AccountCategory.ASSET, NormalBalance.DEBIT),
            ("1020", "HDFC Operating Bank Account", AccountCategory.ASSET, NormalBalance.DEBIT),
            ("1200", "Food & Beverage Inventory Asset", AccountCategory.ASSET, NormalBalance.DEBIT),
            ("2010", "Accounts Payable - Food Vendors", AccountCategory.LIABILITY, NormalBalance.CREDIT),
            ("4010", "Food Sales Revenue", AccountCategory.REVENUE, NormalBalance.CREDIT),
            ("4020", "Beverage & Bar Sales Revenue", AccountCategory.REVENUE, NormalBalance.CREDIT),
            ("5010", "Cost of Goods Sold (Food COGS)", AccountCategory.EXPENSE, NormalBalance.DEBIT),
            ("5020", "Cost of Goods Sold (Beverage COGS)", AccountCategory.EXPENSE, NormalBalance.DEBIT),
            ("6010", "Kitchen & Staff Payroll", AccountCategory.EXPENSE, NormalBalance.DEBIT),
            ("6020", "Restaurant Rent & Utilities", AccountCategory.EXPENSE, NormalBalance.DEBIT),
        ]

        accounts_map = {}
        for acode, aname, acat, abal in accounts_data:
            acc_obj, _ = Account.objects.update_or_create(
                restaurant=restaurant,
                code=acode,
                defaults={"name": aname, "category": acat, "normal_balance": abal, "is_active": True},
            )
            accounts_map[acode] = acc_obj

        # Cash Drawer Session
        CashSession.objects.update_or_create(
            restaurant=restaurant,
            register_name="Front Counter POS #1",
            defaults={
                "opened_by": staff_members["cashier@fluxiflow.com"].user,
                "opening_balance": Decimal("5000.00"),
                "status": CashSession.SessionStatus.OPEN,
                "cash_sales": Decimal("18450.00"),
                "expected_cash": Decimal("23450.00"),
            },
        )

        # 14. HR & Staff Operations
        self.stdout.write("- Seeding HR departments, shifts, and attendance...")
        dept_kitchen, _ = Department.objects.update_or_create(
            restaurant=restaurant, code="KITCHEN", defaults={"name": "Kitchen & Culinary Ops", "is_active": True}
        )
        dept_foh, _ = Department.objects.update_or_create(
            restaurant=restaurant, code="FOH", defaults={"name": "Front of House & Floor", "is_active": True}
        )

        pos_chef, _ = Position.objects.update_or_create(
            restaurant=restaurant, department=dept_kitchen, code="CHEF", defaults={"title": "Executive Chef"}
        )
        pos_waiter, _ = Position.objects.update_or_create(
            restaurant=restaurant, department=dept_foh, code="SERVER", defaults={"title": "Dining Room Server"}
        )

        Shift.objects.update_or_create(
            restaurant=restaurant,
            name="Dinner Service Shift",
            defaults={
                "start_time": "16:00:00",
                "end_time": "00:00:00",
                "unpaid_break_minutes": 45,
                "is_active": True,
            },
        )

        AttendanceSession.objects.update_or_create(
            restaurant=restaurant,
            staff_profile=staff_members["chef@fluxiflow.com"],
            date=timezone.now().date(),
            defaults={
                "clock_in": timezone.now() - timedelta(hours=4),
                "status": AttendanceStatus.PRESENT,
                "worked_hours": Decimal("4.00"),
            },
        )

        # 15. System Notifications & Alerts
        self.stdout.write("- Seeding system notifications and alerts...")
        Notification.objects.update_or_create(
            restaurant=restaurant,
            recipient=staff_members["admin@fluxiflow.com"].user,
            title="Table T-01 VIP Order Dispatched",
            defaults={
                "notification_type": NotificationType.KDS_READY,
                "severity": NotificationSeverity.INFO,
                "message": "Prime Angus Ribeye is currently preparing on the Grill Station.",
                "is_read": False,
            },
        )
        Notification.objects.update_or_create(
            restaurant=restaurant,
            recipient=staff_members["admin@fluxiflow.com"].user,
            title="Low Inventory Alert: Black Truffle Oil",
            defaults={
                "notification_type": NotificationType.INVENTORY_LOW_STOCK,
                "severity": NotificationSeverity.WARNING,
                "message": "Stock level for Black Truffle Oil is at 5 bottles (reorder point reached).",
                "is_read": False,
            },
        )

        self.stdout.write(self.style.SUCCESS("[SUCCESS] Successfully seeded full, realistic mock data for all Fluxiflow pages!"))
