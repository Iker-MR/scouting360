from rest_framework.routers import DefaultRouter

from .views import JugadorViewSet, OjeadorViewSet

router = DefaultRouter()
router.register("jugadores", JugadorViewSet)
router.register("ojeadores", OjeadorViewSet)

urlpatterns = router.urls
