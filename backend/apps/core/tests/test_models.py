import uuid
from django.test import TestCase
from django.db import models
from apps.core.models import TenantAwareModel, StatusModel

# Concrete dummy model for testing abstract base models
class DummyTenantItem(TenantAwareModel, StatusModel):
    name = models.CharField(max_length=100)

    class Meta:
        app_label = "core"

class CoreBaseModelTests(TestCase):
    def test_uuid_and_timestamp_generation(self):
        """Verify that UUID primary keys and timestamps are automatically generated."""
        tenant_id = uuid.uuid4()
        item = DummyTenantItem(name="Test Dish", tenant_id=tenant_id)
        self.assertIsNotNone(item.id)
        self.assertIsInstance(item.id, uuid.UUID)
        self.assertEqual(item.tenant_id, tenant_id)
        self.assertFalse(item.is_deleted)
        self.assertTrue(item.is_active)

    def test_soft_delete_and_restore(self):
        """Verify soft deletion flag and restore mechanism."""
        item = DummyTenantItem(name="Sample Item", tenant_id=uuid.uuid4())
        self.assertFalse(item.is_deleted)
        self.assertIsNone(item.deleted_at)

        # Soft delete
        item.is_deleted = True
        item.deleted_at = None
        self.assertTrue(item.is_deleted)

        # Restore
        item.is_deleted = False
        self.assertFalse(item.is_deleted)
