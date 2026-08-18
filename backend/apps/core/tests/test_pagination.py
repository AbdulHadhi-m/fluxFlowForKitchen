from django.test import TestCase, RequestFactory
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from apps.core.pagination import FluxiflowPagination

class DummyListView(APIView):
    permission_classes = [AllowAny]
    pagination_class = FluxiflowPagination

    def get(self, request):
        dataset = [{"id": i, "name": f"Item {i}"} for i in range(1, 55)]
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(dataset, request, view=self)
        return paginator.get_paginated_response(page)

class PaginationTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.view = DummyListView.as_view()

    def test_default_pagination_envelope(self):
        """Verify default page size of 20 and structure of pagination metadata."""
        request = self.factory.get("/api/v1/dummy/?page=1")
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        data = response.data

        self.assertTrue(data["success"])
        self.assertIn("meta", data)
        self.assertEqual(data["meta"]["count"], 54)
        self.assertEqual(data["meta"]["total_pages"], 3)
        self.assertEqual(data["meta"]["current_page"], 1)
        self.assertEqual(data["meta"]["page_size"], 20)
        self.assertEqual(len(data["data"]), 20)

    def test_custom_page_size_and_max_limit(self):
        """Verify custom page size query parameter with maximum boundary limit."""
        # Request page size 10
        request = self.factory.get("/api/v1/dummy/?page_size=10")
        response = self.view(request)
        self.assertEqual(len(response.data["data"]), 10)
        self.assertEqual(response.data["meta"]["total_pages"], 6)

        # Request unreasonably high page size (capped at 100)
        request = self.factory.get("/api/v1/dummy/?page_size=500")
        response = self.view(request)
        self.assertEqual(response.data["meta"]["page_size"], 100)
