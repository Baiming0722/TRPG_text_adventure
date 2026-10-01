// map/map-system.js
// 地圖系統：管理場景節點、路徑連結、進入條件與探索狀態

import { eventBus, GameEvent } from '../js/event-bus.js';
import { gameState } from '../js/game-state.js';
import { CONFIG } from '../js/config.js';
import { checkCondition } from '../event/event-system.js';

export async function loadMap(mapId) {
  const response = await fetch(`${CONFIG.CARD_BASE_PATH}/maps/${mapId}.json`);
  if (!response.ok) throw new Error(`無法載入地圖卡：${mapId}`);
  const card = await response.json();

  for (const node of card.nodes) {
    const savedState = gameState.getMapNodeState(mapId, node.id);
    const explored = savedState.explored ?? node.explored ?? false;
    gameState.updateMapNode(mapId, node.id, {
      explored,
      locked: savedState.locked ?? node.locked ?? false,
    });
    if (explored) {
      gameState.setFlag(`node_${node.id}_explored`, true);
    }
  }

  gameState.update({ currentMapId: mapId, currentMapCard: card });
  return card;
}

export function getNode(nodeId) {
  const mapCard = gameState.get('currentMapCard');
  if (!mapCard) return null;
  const node = mapCard.nodes.find(n => n.id === nodeId);
  if (!node) return null;
  const mapId = gameState.get('currentMapId');
  const liveState = gameState.getMapNodeState(mapId, nodeId);
  return { ...node, ...liveState };
}

export function getCurrentNode() {
  const nodeId = gameState.get('currentNodeId');
  return nodeId ? getNode(nodeId) : null;
}

export function moveToNode(nodeId) {
  const mapCard = gameState.get('currentMapCard');
  if (!mapCard) return { success: false, reason: '地圖尚未載入' };
  const node = getNode(nodeId);
  if (!node) return { success: false, reason: `找不到節點：${nodeId}` };
  if (node.locked) return { success: false, reason: '此區域目前鎖定，無法進入。' };

  const state = gameState.getState();
  if (node.entry_condition && !checkCondition(node.entry_condition, state)) {
    return { success: false, reason: node.entry_condition.fail_message ?? '尚不具備進入條件。' };
  }

  const mapId = gameState.get('currentMapId');
  _setNodeExplored(mapId, nodeId);
  gameState.update({ currentNodeId: nodeId });
  eventBus.emit(GameEvent.MAP_NODE_CHANGED, { nodeId, node });
  return { success: true, reason: '' };
}

export function getAdjacentNodes() {
  const currentNode = getCurrentNode();
  if (!currentNode) return [];
  const state = gameState.getState();
  return (currentNode.connections ?? []).map(connId => {
    const node = getNode(connId);
    if (!node) return null;
    const accessible = !node.locked && (!node.entry_condition || checkCondition(node.entry_condition, state));
    return { ...node, accessible };
  }).filter(Boolean);
}

export function unlockNode(mapId, nodeId) {
  gameState.updateMapNode(mapId, nodeId, { locked: false });
  eventBus.emit(GameEvent.MAP_NODE_CHANGED, { nodeId, unlocked: true });
}

export function markExplored(mapId, nodeId) {
  _setNodeExplored(mapId, nodeId);
}

export function getMapSummary() {
  const mapCard = gameState.get('currentMapCard');
  const mapId = gameState.get('currentMapId');
  const currentNodeId = gameState.get('currentNodeId');
  if (!mapCard) return [];
  const state = gameState.getState();
  return mapCard.nodes.map(node => {
    const liveState = gameState.getMapNodeState(mapId, node.id);
    const locked = liveState.locked ?? node.locked ?? false;
    const accessible = !locked && (!node.entry_condition || checkCondition(node.entry_condition, state));
    return {
      ...node,
      explored: liveState.explored ?? false,
      locked,
      isCurrent: node.id === currentNodeId,
      accessible,
    };
  });
}

function _setNodeExplored(mapId, nodeId) {
  gameState.updateMapNode(mapId, nodeId, { explored: true });
  gameState.setFlag(`node_${nodeId}_explored`, true);
}
