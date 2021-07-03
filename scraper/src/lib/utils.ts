import type puppeteer from 'puppeteer';
import Downloader from 'nodejs-file-downloader';
import { Work } from '..';

export async function fetchYears(page: puppeteer.Page) {
	const years = await page.$$eval('select#naloga_leto.filter_select > option', (years) => years.map((y) => y.innerHTML));
	years.shift();
	return years;
}

export async function gotoYear(page: puppeteer.Page, year: string) {
	await page.waitForTimeout(500);
	await page.select('select#naloga_leto.filter_select', year);
}

export function fetchInnerValue(element: Element | HTMLTableElement) {
	const lastChild = element.lastElementChild as HTMLTableElement;

	return lastChild.innerText;
}

export async function downloadWork(work: Work, workDirectory: string) {
	if (!work.digitalOut) return;
	const fileDownloader = new Downloader({
		url: work.digitalOut,
		directory: workDirectory,
		onBeforeSave: (finalName: string) => decodeURIComponent(finalName)
	});
	await fileDownloader.download().catch(async () => {
		await downloadWork(work, workDirectory);
	});
}
