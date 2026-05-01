const DAY_NAMES_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DAY_NAMES_LONG = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function dayNameShort(date: Date): string {
	return DAY_NAMES_SHORT[date.getDay()];
}

export function formatDateLong(date: Date): string {
	const day = DAY_NAMES_LONG[date.getDay()];
	const month = MONTH_NAMES[date.getMonth()];
	return `${capitalize(day)}, ${date.getDate()} de ${month} de ${date.getFullYear()}`;
}

export function formatDateWithLocation(date: Date, location: string | null): string {
	const day = DAY_NAMES_LONG[date.getDay()];
	const month = MONTH_NAMES[date.getMonth()];
	const dateStr = `${capitalize(day)}, ${date.getDate()} ${month} ${date.getFullYear()}`;
	return location ? `${location} · ${dateStr}` : dateStr;
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
