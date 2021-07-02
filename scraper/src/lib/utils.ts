import type puppeteer from 'puppeteer';

export async function fetchYears(page: puppeteer.Page) {
	const years = await page.$$eval('select#naloga_leto.filter_select > option', (years) => years.map((y) => y.innerHTML));
	years.shift();
	return years;
}

export async function gotoYear(page: puppeteer.Page, year: string) {
	await page.waitForTimeout(500);
	await page.select('select#naloga_leto.filter_select', year);
}
