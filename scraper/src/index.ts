import { fetchYears, gotoYear } from '#lib/utils';
import puppeteer from 'puppeteer';
import { SCHOOL } from '#root/consts';
import fsp from 'fs/promises';
import sanitize from 'sanitize-filename';
import Downloader from 'nodejs-file-downloader';
import path from 'path';

const outPath = path.join(__dirname, '..', '..', 'naloge/');
const headless = true;

const main = async () => {
	const browser = await puppeteer.launch({
		timeout: 0,
		dumpio: !headless,
		headless,
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-translate', '--disable-extensions'],
		ignoreHTTPSErrors: true
	});

	const page = await browser.newPage();
	await page.goto('https://zpm-mb.si/raziskovalne-naloge/', { waitUntil: 'networkidle2' });
	await page.select('select#naloga_sola.filter_select', SCHOOL);

	await page.waitForTimeout(1000);

	const years = await fetchYears(page);

	for (const year of years) {
		await gotoYear(page, year);
		await fsp.mkdir(path.join(outPath, year), { recursive: true });

		await page.waitForTimeout(1000);

		const works = await page.$$eval<Work[]>(
			'div.rezultat_filter > div.large-3.columns > table.raz_naloga_table > tbody',
			// @ts-expect-error I hate HTML queries
			(works: HTMLTableElement[]) => {
				function fetchInnerValue(element: Element | HTMLTableElement) {
					const lastChild = element.lastElementChild as HTMLTableElement;

					return lastChild.innerText;
				}

				return works.map(({ rows }) => {
					return {
						name: rows[0].innerText.replace(/\\t/gm, ''),
						type: fetchInnerValue(rows[2]),
						area: fetchInnerValue(rows[3]),
						authors: fetchInnerValue(rows[5]).split(', '),
						mentors: fetchInnerValue(rows[6]).split(', '),
						digitalOut: (rows[11].lastElementChild!.lastElementChild as HTMLAnchorElement)?.href
					};
				});
			}
		);

		for (const work of works) {
			const sanitizedName = sanitize(work.name);
			await fsp.mkdir(path.join(outPath, year, sanitizedName), { recursive: true });

			if (work.digitalOut) {
				const fileDownloader = new Downloader({
					url: work.digitalOut,
					directory: path.join(outPath, year, sanitizedName),
					onBeforeSave: (finalName: string) => decodeURIComponent(finalName)
				});
				await fileDownloader.download();
			}
		}
	}
};

void main();

interface Work {
	name: string;
	type: string;
	area: string;
	authors: string[];
	mentors: string[];
	digitalOut?: string;
}
