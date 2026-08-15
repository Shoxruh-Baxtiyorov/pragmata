"""Организация реестра людей: редактируемые категории (per-site) и папки-дерево
(напр. Школа → 5-е классы → 5-А). Категории и папки принадлежат площадке.

Категории заменяют прежний жёсткий список: их можно добавлять/удалять. Валидация
Person.category идёт по списку категорий площадки (fallback — дефолты).
"""

from __future__ import annotations

import re
import uuid  # noqa: TC003 — uuid.UUID в сигнатурах роутов
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy import func, select

from pragmata.api.deps import session_factory

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

# базовые категории: сеются миграцией и служат fallback для площадок без своих
DEFAULT_CATEGORIES: tuple[tuple[str, str], ...] = (
    ("employee", "Сотрудник"),
    ("visitor", "Гость"),
    ("contractor", "Подрядчик"),
    ("watchlist", "Наблюдение"),
    ("banned", "Бан"),
    ("other", "Другое"),
)
_DEFAULT_KEYS = frozenset(k for k, _ in DEFAULT_CATEGORIES)


def _site(scope: int | None) -> int:
    """Конкретная площадка для операций: у админа без X-Site-Id — основная (1)."""
    return scope if scope is not None else 1


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")
    return s or f"c{uuid.uuid4().hex[:6]}"


# ── категории ───────────────────────────────────────────────────────────────


def allowed_category_keys(site_id: int | None) -> set[str]:
    """Ключи категорий, разрешённые для человека этой площадки (или дефолты)."""
    from pragmata.db.models import PersonCategory

    if site_id is None:
        return set(_DEFAULT_KEYS)
    with session_factory()() as s:
        keys = set(
            s.execute(
                select(PersonCategory.key).where(PersonCategory.site_id == site_id)
            ).scalars()
        )
    return keys or set(_DEFAULT_KEYS)


def list_categories(scope: int | None) -> list[dict[str, object]]:
    from pragmata.db.models import PersonCategory

    site_id = _site(scope)
    with session_factory()() as s:
        rows = s.execute(
            select(PersonCategory)
            .where(PersonCategory.site_id == site_id)
            .order_by(PersonCategory.sort, PersonCategory.name)
        ).scalars().all()
        return [
            {"id": str(c.id), "key": c.key, "name": c.name, "is_system": c.is_system}
            for c in rows
        ]


def create_category(name: str, scope: int | None) -> dict[str, object]:
    from pragmata.db.models import PersonCategory

    name = name.strip()
    if not name:
        raise HTTPException(422, "название категории обязательно")
    site_id = _site(scope)
    with session_factory()() as s:
        existing = set(
            s.execute(
                select(PersonCategory.key).where(PersonCategory.site_id == site_id)
            ).scalars()
        )
        base = _slug(name)
        key = base
        i = 2
        while key in existing:
            key = f"{base}_{i}"
            i += 1
        nxt = s.execute(
            select(func.coalesce(func.max(PersonCategory.sort), 0)).where(
                PersonCategory.site_id == site_id
            )
        ).scalar_one()
        cat = PersonCategory(site_id=site_id, key=key, name=name, sort=int(nxt) + 1)
        s.add(cat)
        s.commit()
        return {"id": str(cat.id), "key": cat.key, "name": cat.name, "is_system": cat.is_system}


def delete_category(cat_id: uuid.UUID, scope: int | None) -> None:
    from pragmata.db.models import Person, PersonCategory

    site_id = _site(scope)
    with session_factory()() as s:
        cat = s.get(PersonCategory, cat_id)
        if cat is None or cat.site_id != site_id:
            raise HTTPException(404, "нет такой категории")
        used = s.execute(
            select(func.count())
            .select_from(Person)
            .where(Person.site_id == site_id, Person.category == cat.key)
        ).scalar_one()
        if used:
            raise HTTPException(409, f"категорию используют {used} чел. — сначала переназначьте")
        s.delete(cat)
        s.commit()


# ── папки (дерево) ────────────────────────────────────────────────────────────


def list_folders(scope: int | None) -> list[dict[str, object]]:
    from pragmata.db.models import Person, PersonFolder

    site_id = _site(scope)
    with session_factory()() as s:
        rows = s.execute(
            select(PersonFolder)
            .where(PersonFolder.site_id == site_id)
            .order_by(PersonFolder.sort, PersonFolder.name)
        ).scalars().all()
        counts = {
            r[0]: r[1]
            for r in s.execute(
                select(Person.folder_id, func.count())
                .where(Person.site_id == site_id, Person.folder_id.is_not(None))
                .group_by(Person.folder_id)
            ).all()
        }
        return [
            {
                "id": str(f.id),
                "parent_id": str(f.parent_id) if f.parent_id else None,
                "name": f.name,
                "count": int(counts.get(f.id, 0)),
            }
            for f in rows
        ]


def _subtree_ids(s: Session, site_id: int, folder_id: uuid.UUID) -> set[uuid.UUID]:
    """folder_id + все потомки (для фильтра людей по ветке дерева)."""
    from pragmata.db.models import PersonFolder

    children: dict[uuid.UUID | None, list[uuid.UUID]] = {}
    for fid, pid in s.execute(
        select(PersonFolder.id, PersonFolder.parent_id).where(PersonFolder.site_id == site_id)
    ).all():
        children.setdefault(pid, []).append(fid)
    out: set[uuid.UUID] = set()
    stack = [folder_id]
    while stack:
        cur = stack.pop()
        if cur in out:
            continue
        out.add(cur)
        stack.extend(children.get(cur, []))
    return out


def subtree_ids(scope: int | None, folder_id: uuid.UUID) -> list[uuid.UUID]:
    with session_factory()() as s:
        return list(_subtree_ids(s, _site(scope), folder_id))


def create_folder(name: str, parent_id: uuid.UUID | None, scope: int | None) -> dict[str, object]:
    from pragmata.db.models import PersonFolder

    name = name.strip()
    if not name:
        raise HTTPException(422, "название папки обязательно")
    site_id = _site(scope)
    with session_factory()() as s:
        if parent_id is not None:
            parent = s.get(PersonFolder, parent_id)
            if parent is None or parent.site_id != site_id:
                raise HTTPException(422, "родительская папка не найдена")
        nxt = s.execute(
            select(func.coalesce(func.max(PersonFolder.sort), 0)).where(
                PersonFolder.site_id == site_id
            )
        ).scalar_one()
        f = PersonFolder(site_id=site_id, parent_id=parent_id, name=name, sort=int(nxt) + 1)
        s.add(f)
        s.commit()
        return {
            "id": str(f.id),
            "parent_id": str(parent_id) if parent_id else None,
            "name": f.name,
        }


def patch_folder(
    folder_id: uuid.UUID,
    scope: int | None,
    name: str | None = None,
    parent_id: uuid.UUID | None = None,
    clear_parent: bool = False,
) -> None:
    from pragmata.db.models import PersonFolder

    site_id = _site(scope)
    with session_factory()() as s:
        f = s.get(PersonFolder, folder_id)
        if f is None or f.site_id != site_id:
            raise HTTPException(404, "нет такой папки")
        if name is not None and name.strip():
            f.name = name.strip()
        if clear_parent:
            f.parent_id = None
        elif parent_id is not None:
            if parent_id == folder_id or parent_id in _subtree_ids(s, site_id, folder_id):
                raise HTTPException(422, "нельзя вложить папку в саму себя")
            parent = s.get(PersonFolder, parent_id)
            if parent is None or parent.site_id != site_id:
                raise HTTPException(422, "родительская папка не найдена")
            f.parent_id = parent_id
        s.commit()


def delete_folder(folder_id: uuid.UUID, scope: int | None) -> None:
    """Удалить папку: детей-папки и людей поднимаем к родителю (без сирот)."""
    from pragmata.db.models import Person, PersonFolder

    site_id = _site(scope)
    with session_factory()() as s:
        f = s.get(PersonFolder, folder_id)
        if f is None or f.site_id != site_id:
            raise HTTPException(404, "нет такой папки")
        up = f.parent_id
        for child in s.execute(
            select(PersonFolder).where(PersonFolder.parent_id == folder_id)
        ).scalars():
            child.parent_id = up
        for person in s.execute(
            select(Person).where(Person.folder_id == folder_id)
        ).scalars():
            person.folder_id = up
        s.delete(f)
        s.commit()


def assert_folder_ok(folder_id: uuid.UUID | None, site_id: int | None) -> None:
    """Папка человека должна принадлежать той же площадке (или быть пустой)."""
    if folder_id is None:
        return
    from pragmata.db.models import PersonFolder

    with session_factory()() as s:
        f = s.get(PersonFolder, folder_id)
    if f is None or (site_id is not None and f.site_id != site_id):
        raise HTTPException(422, "папка не найдена")
