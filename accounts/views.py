from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import MeSerializer, RegistroSerializer

COOKIE = settings.JWT_REFRESH_COOKIE


def set_refresh_cookie(response, refresh):
    response.set_cookie(
        COOKIE["NAME"],
        refresh,
        max_age=int(api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        path=COOKIE["PATH"],
        secure=COOKIE["SECURE"],
        httponly=True,
        samesite=COOKIE["SAMESITE"],
    )


class CookieTokenObtainPairView(TokenObtainPairView):
    """Returns the access token in the body and the refresh token in an httpOnly cookie."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        set_refresh_cookie(response, response.data.pop("refresh"))
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Reads the refresh token only from the cookie, never from the request body."""

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(COOKIE["NAME"])
        if not refresh:
            raise InvalidToken("Refresh token cookie not found.")

        serializer = self.get_serializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0]) from e

        data = dict(serializer.validated_data)
        response = Response(data, status=status.HTTP_200_OK)
        if "refresh" in data:
            set_refresh_cookie(response, data.pop("refresh"))
        return response


class RegisterView(generics.CreateAPIView):
    serializer_class = RegistroSerializer
    authentication_classes = ()
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"


class MeView(generics.RetrieveAPIView):
    """Returns the authenticated user and the id of their player profile, if any."""

    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    authentication_classes = ()
    permission_classes = ()

    def post(self, request):
        refresh = request.COOKIES.get(COOKIE["NAME"])
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass  # Already invalid, expired or blacklisted: nothing to revoke.

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(
            COOKIE["NAME"], path=COOKIE["PATH"], samesite=COOKIE["SAMESITE"]
        )
        return response
