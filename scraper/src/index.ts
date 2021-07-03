import { downloadWork, fetchYears, gotoYear } from '#lib/utils';
import { SCHOOL } from '#root/consts';
import fsp from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import sanitize from 'sanitize-filename';

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
						name: rows[0].innerText.replace(/\t/gm, ''),
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
			const workDirectory = path.join(outPath, year, sanitizedName);
			await fsp.mkdir(workDirectory, { recursive: true });

			await downloadWork(work, workDirectory);

			const fileName = work.digitalOut ? decodeURIComponent(work.digitalOut.split('/').pop()!.split('.').shift()!) : sanitizedName;

			await fsp.writeFile(path.join(workDirectory, `${fileName}.json`), JSON.stringify(work, null, '\t'), { encoding: 'utf8' });
			await fsp.writeFile(path.join(workDirectory, `${fileName}.md`), [`# ${work.name}`].join('\n'), { encoding: 'utf8' });
		}

		console.log('Done');
		await browser.close();
		process.exit();
	}
};

void main();

export interface Work {
	name: string;
	type: string;
	area: string;
	authors: string[];
	mentors: string[];
	digitalOut?: string;
}
