import math
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class FluxiflowPagination(PageNumberPagination):
    """
    Standard pagination class for Fluxiflow REST API.
    Provides predictable pagination envelope and safe client limits.
    """
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    page_query_param = "page"

    def get_paginated_response(self, data):
        total_count = self.page.paginator.count
        page_size = self.get_page_size(self.request) or self.page_size
        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        current_page = self.page.number

        return Response(
            {
                "success": True,
                "meta": {
                    "count": total_count,
                    "total_pages": total_pages,
                    "current_page": current_page,
                    "page_size": page_size,
                    "next": self.get_next_link(),
                    "previous": self.get_previous_link(),
                },
                "data": data,
            }
        )
