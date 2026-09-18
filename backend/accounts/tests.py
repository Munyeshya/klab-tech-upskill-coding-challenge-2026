from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase


class AuthenticationApiTests(APITestCase):
    def test_register_user(self):
        response = self.client.post(
            '/auth/register',
            {
                'username': 'alice',
                'email': 'alice@example.com',
                'password': 'StrongPass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('password', response.data)
        self.assertTrue(User.objects.filter(username='alice').exists())

    def test_obtain_and_refresh_tokens(self):
        User.objects.create_user(username='alice', password='StrongPass123!')

        login = self.client.post(
            '/auth/token',
            {'username': 'alice', 'password': 'StrongPass123!'},
            format='json',
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn('access', login.data)
        self.assertIn('refresh', login.data)

        refresh = self.client.post(
            '/auth/token/refresh',
            {'refresh': login.data['refresh']},
            format='json',
        )
        self.assertEqual(refresh.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh.data)

    def test_get_current_user(self):
        user = User.objects.create_user(username='alice', password='StrongPass123!')
        self.client.force_authenticate(user=user)

        response = self.client.get('/auth/me')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'alice')

    def test_current_user_requires_authentication(self):
        response = self.client.get('/auth/me')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

# Create your tests here.
