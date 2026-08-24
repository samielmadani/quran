/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare module 'ionicons/icons' {
	export const close: string;
	export const play: string;
	export const pause: string;
	export const add: string;
	export const remove: string;
	export const bookmarkOutline: string;
	export const checkmarkCircle: string;
	export const chevronBack: string;
	export const chevronForward: string;
	export const createOutline: string;
	export const globeOutline: string;
	export const heart: string;
	export const heartOutline: string;
	export const infiniteOutline: string;
	export const pauseCircleOutline: string;
	export const pin: string;
	export const pinOutline: string;
	export const repeatOutline: string;
	export const searchOutline: string;
	export const settingsOutline: string;
	export const timeOutline: string;
	export const cloudDownloadOutline: string;
	export const radioOutline: string;
	export const trashOutline: string;
}
