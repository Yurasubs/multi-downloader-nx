import { DownloadInfo, FolderTypes, GuiState, ProgressData, QueueItem } from '../../../@types/messageHandler';
import { RandomEvent, RandomEvents } from '../../../@types/randomEvents';
import WebSocketHandler from '../websocket';
import open from 'open';
import { cfg } from '..';
import path from 'path';
import { console } from '../../../modules/log';
import { getState, setState } from '../../../modules/module.cfg-loader';
import packageJson from '../../../package.json';

export default class Base {
	private state: GuiState;
	public name = 'default';
	constructor(private ws: WebSocketHandler) {
		this.state = getState();
	}

	private downloading = false;

	private queue: QueueItem[] = [];
	private workOnQueue = false;

	async version(): Promise<string> {
		return packageJson.version;
	}

	initState() {
		if (this.state.services[this.name]) {
			this.queue = this.state.services[this.name].queue;
			this.queueChange();
		} else {
			this.state.services[this.name] = {
				queue: []
			};
		}
	}

	setDownloading(downloading: boolean) {
		this.downloading = downloading;
	}

	getDownloading() {
		return this.downloading;
	}

	alertError(error: Error) {
		console.error(`${error}`);
	}

	makeProgressHandler(videoInfo: DownloadInfo) {
		return (data: ProgressData) => {
			this.sendMessage({
				name: 'progress',
				data: {
					downloadInfo: videoInfo,
					progress: data
				}
			});
		};
	}

	sendMessage<T extends keyof RandomEvents>(data: RandomEvent<T>) {
		this.ws.sendMessage(data);
	}

	async isDownloading() {
		return this.downloading;
	}

	async openFolder(folderType: FolderTypes) {
		switch (folderType) {
			case 'content':
				open(cfg.dir.content);
				break;
			case 'config':
				open(cfg.dir.config);
				break;
		}
	}

	async openFile(data: [FolderTypes, string]) {
		switch (data[0]) {
			case 'config': {
				const resolvedConfigDir = path.resolve(cfg.dir.config);
				const targetPath = path.resolve(resolvedConfigDir, data[1]);
				if (!targetPath.startsWith(resolvedConfigDir)) {
					console.warn(`[Security] Path traversal attempt in openFile: ${data[1]}`);
					throw new Error('Access denied: path outside config directory');
				}
				open(targetPath);
				break;
			}
			case 'content':
				throw new Error('No subfolders');
		}
	}

	async openURL(data: string) {
		if (typeof data !== 'string' || !/^https?:\/\//i.test(data.trim())) {
			console.warn(`[Security] Refusing to open unsafe URL: ${data}`);
			return;
		}
		open(data.trim());
	}

	public async getQueue(): Promise<QueueItem[]> {
		return this.queue;
	}

	public async removeFromQueue(index: number) {
		this.queue.splice(index, 1);
		this.queueChange();
	}

	public async clearQueue() {
		this.queue = [];
		this.queueChange();
	}

	public addToQueue(data: QueueItem[]) {
		this.queue = this.queue.concat(...data);
		this.queueChange();
	}

	public setDownloadQueue(data: boolean) {
		this.workOnQueue = data;
		this.queueChange();
	}

	public async getDownloadQueue(): Promise<boolean> {
		return this.workOnQueue;
	}

	private isProcessingQueue = false;

	private async queueChange() {
		this.sendMessage({ name: 'queueChange', data: this.queue });
		if (this.workOnQueue && this.queue.length > 0 && !this.downloading && !this.isProcessingQueue) {
			this.isProcessingQueue = true;
			this.setDownloading(true);
			const item = this.queue[0];
			this.queue = this.queue.slice(1);
			this.sendMessage({ name: 'current', data: item });
			(async () => {
				try {
					await this.downloadItem(item);
				} catch (err) {
					console.error(`[Queue] Failed to download item: ${err}`);
				} finally {
					this.setDownloading(false);
					this.isProcessingQueue = false;
					await this.onFinish();
				}
			})();
		}
		this.state.services[this.name].queue = this.queue;
		setState(this.state);
	}

	public async onFinish() {
		this.sendMessage({ name: 'current', data: undefined });
		this.queueChange();
	}

	//Overriten
	// eslint-disable-next-line
	public async downloadItem(_: QueueItem) {
		throw new Error('downloadItem not overriden');
	}
}
