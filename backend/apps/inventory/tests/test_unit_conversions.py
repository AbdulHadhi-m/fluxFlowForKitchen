from decimal import Decimal
import pytest
from rest_framework.exceptions import ValidationError
from apps.inventory.services import UnitConverter, quantize_stock
from apps.inventory.models import InventoryItem, UnitOfMeasure


class TestUnitConversions:
    def test_weight_conversions(self):
        # 1.5 kg -> 1500 g
        res_g = UnitConverter.convert(Decimal("1.500"), from_unit="kg", to_unit="g")
        assert res_g == Decimal("1500.000")

        # 250 g -> 0.25 kg
        res_kg = UnitConverter.convert(Decimal("250.000"), from_unit="g", to_unit="kg")
        assert res_kg == Decimal("0.250")

        # 16 oz -> 453.592 g
        res_oz_to_g = UnitConverter.convert(Decimal("16.000"), from_unit="oz", to_unit="g")
        assert res_oz_to_g == Decimal("453.592")

    def test_volume_conversions(self):
        # 2.5 l -> 2500 ml
        res_ml = UnitConverter.convert(Decimal("2.500"), from_unit="l", to_unit="ml")
        assert res_ml == Decimal("2500.000")

        # 750 ml -> 0.75 l
        res_l = UnitConverter.convert(Decimal("750.000"), from_unit="ml", to_unit="l")
        assert res_l == Decimal("0.750")

    def test_incompatible_cross_dimensional_conversion(self):
        # kg to ml without density must raise ValidationError
        with pytest.raises(ValidationError) as exc:
            UnitConverter.convert(Decimal("1.000"), from_unit="kg", to_unit="ml")
        assert "Incompatible unit conversion" in str(exc.value)

    def test_custom_item_purchase_factor(self):
        item = InventoryItem(
            unit=UnitOfMeasure.PIECE,
            purchase_unit=UnitOfMeasure.BOX,
            purchase_to_stock_factor=Decimal("24.0000"),
        )

        # 2 boxes -> 48 pieces
        pieces = UnitConverter.convert(Decimal("2.000"), from_unit="box", to_unit="piece", item=item)
        assert pieces == Decimal("48.000")

        # 48 pieces -> 2 boxes
        boxes = UnitConverter.convert(Decimal("48.000"), from_unit="piece", to_unit="box", item=item)
        assert boxes == Decimal("2.000")
