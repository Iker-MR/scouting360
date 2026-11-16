from django.contrib import admin

from .models import Ojeador


@admin.register(Ojeador)
class OjeadorAdmin(admin.ModelAdmin):
    # Staff verify scouts by hand (FIFA licence, club email...) from here.
    list_display = ["nombre", "organizacion", "usuario", "verificado", "creado"]
    list_filter = ["verificado"]
    list_editable = ["verificado"]
    search_fields = ["nombre", "organizacion", "usuario__username"]
