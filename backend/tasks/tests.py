from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Task


class TaskApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='alice', password='StrongPass123!'
        )
        self.client.force_authenticate(user=self.user)
        self.task = Task.objects.create(
            owner=self.user,
            title='Build the API',
            description='Implement the task endpoints.',
            priority=Task.Priority.HIGH,
        )

    def test_list_tasks(self):
        response = self.client.get('/tasks')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], self.task.title)
        self.assertIn('createdAt', response.data[0])

    def test_get_one_task(self):
        response = self.client.get(f'/tasks/{self.task.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.task.id)

    def test_create_task(self):
        payload = {
            'title': 'Build the frontend',
            'description': 'Create the React application.',
            'status': 'pending',
            'priority': 'medium',
        }

        response = self.client.post('/tasks', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Task.objects.count(), 2)
        self.assertEqual(response.data['title'], payload['title'])
        self.assertEqual(Task.objects.get(id=response.data['id']).owner, self.user)

    def test_update_task(self):
        payload = {
            'title': 'API completed',
            'description': self.task.description,
            'status': 'completed',
            'priority': 'high',
        }

        response = self.client.put(
            f'/tasks/{self.task.id}', payload, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, Task.Status.COMPLETED)

    def test_partially_update_task_status(self):
        response = self.client.patch(
            f'/tasks/{self.task.id}',
            {'status': 'completed'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, Task.Status.COMPLETED)
        self.assertEqual(self.task.title, 'Build the API')

    def test_delete_task(self):
        response = self.client.delete(f'/tasks/{self.task.id}')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=self.task.id).exists())

    def test_filter_tasks_by_status(self):
        Task.objects.create(
            owner=self.user,
            title='Finished task',
            status=Task.Status.COMPLETED,
        )

        response = self.client.get('/tasks?status=completed')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['status'], 'completed')

    def test_reject_invalid_status_filter(self):
        response = self.client.get('/tasks?status=unknown')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_blank_title(self):
        response = self.client.post(
            '/tasks',
            {'title': '   ', 'description': '', 'priority': 'low'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_reject_invalid_priority(self):
        response = self.client.post(
            '/tasks',
            {'title': 'Invalid task', 'priority': 'urgent'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('priority', response.data)

    def test_missing_task_returns_not_found(self):
        response = self.client.get('/tasks/999999')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_tasks_require_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get('/tasks')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_cannot_access_another_users_task(self):
        other_user = User.objects.create_user(
            username='bob', password='StrongPass123!'
        )
        other_task = Task.objects.create(owner=other_user, title='Private task')

        list_response = self.client.get('/tasks')
        detail_response = self.client.get(f'/tasks/{other_task.id}')

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
