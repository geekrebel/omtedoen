export interface Platform {
	registerGlobalShortcut(shortcut: string, callback: () => void): Promise<void>;
	unregisterGlobalShortcut(shortcut: string): Promise<void>;
	getDeviceId(): Promise<string>;
	isTauri(): boolean;
}
