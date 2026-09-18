from rest_framework import generics
from rest_framework.exceptions import ValidationError

from .models import Task
from .serializers import TaskSerializer


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = Task.objects.filter(owner=self.request.user)
        status = self.request.query_params.get('status')

        if status is not None:
            valid_statuses = {choice.value for choice in Task.Status}
            if status not in valid_statuses:
                raise ValidationError(
                    {'status': f"Must be one of: {', '.join(sorted(valid_statuses))}."}
                )
            queryset = queryset.filter(status=status)

        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer

    def get_queryset(self):
        return Task.objects.filter(owner=self.request.user)
