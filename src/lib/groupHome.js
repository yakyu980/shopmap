import { api } from './apiClient';

export async function fetchGroupHome(groupId) {
  const data = await api.get(`/groups/${groupId}/home`);
  return data.group;
}

export async function addGroupHomeItem(groupId, product) {
  const data = await api.post(`/groups/${groupId}/home/items`, {
    productId: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
    department: product.department,
    shelf: product.shelf,
    zone: product.zone,
    barcode: product.barcode,
  });
  return data.group;
}

export async function updateGroupHomeItem(groupId, itemId, changes) {
  const data = await api.patch(`/groups/${groupId}/home/items/${itemId}`, changes);
  return data.group;
}

export async function removeGroupHomeItem(groupId, itemId) {
  const data = await api.del(`/groups/${groupId}/home/items/${itemId}`);
  return data.group;
}

export async function clearGroupHomeItems(groupId) {
  const data = await api.del(`/groups/${groupId}/home/items`);
  return data.group;
}

export async function reorderGroupHomeItems(groupId, fromId, toId) {
  const data = await api.post(`/groups/${groupId}/home/items/reorder`, { fromId, toId });
  return data.group;
}

export async function importGroupHomeItems(groupId, items) {
  const data = await api.post(`/groups/${groupId}/home/items/import`, { items });
  return data;
}

export async function addGroupFavorite(groupId, favorite) {
  const data = await api.post(`/groups/${groupId}/home/favorites`, favorite);
  return data.group;
}

export async function removeGroupFavorite(groupId, favoriteId) {
  const data = await api.del(`/groups/${groupId}/home/favorites/${favoriteId}`);
  return data.group;
}
