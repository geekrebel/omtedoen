import type { TodoStore } from '$lib/storage/store.js';
import type { SyncResult, SyncStatus } from '$lib/core/types.js';

export interface SyncEngine {
	initialize(store: TodoStore, deviceId: string): Promise<void>;
	push(): Promise<SyncResult>;
	pull(): Promise<SyncResult>;
	sync(): Promise<SyncResult>;
	getStatus(): SyncStatus;
	destroy(): void;
}

export interface SyncAdapter {
	isAvailable(): Promise<boolean>;
	readRemoteChanges(since: string, deviceId: string): Promise<RemoteChanges>;
	writeLocalChanges(changes: LocalChanges, deviceId: string): Promise<void>;
	getLastPullTime(deviceId: string): Promise<string | null>;
	setLastPullTime(deviceId: string, time: string): Promise<void>;
}

export interface RemoteChanges {
	tasks: Array<{ id: string; fields: Record<string, any>; fieldTimestamps: Record<string, string> }>;
	lists: Array<{ id: string; fields: Record<string, any>; fieldTimestamps: Record<string, string> }>;
}

export interface LocalChanges {
	tasks: Array<{ id: string; fields: Record<string, any>; fieldTimestamps: Record<string, string> }>;
	lists: Array<{ id: string; fields: Record<string, any>; fieldTimestamps: Record<string, string> }>;
	timestamp: string;
}
