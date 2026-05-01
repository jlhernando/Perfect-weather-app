<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import type { HourlyData } from '$lib/api/weather';

	interface Props {
		hourly: HourlyData;
		mode: 'real' | 'feels';
		selectedDay: number;
		onDayChange: (day: number) => void;
	}

	let { hourly, mode, selectedDay, onDayChange }: Props = $props();

	let container: HTMLDivElement;
	let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

	const VISIBLE_HOURS = 28;
	const margin = { top: 16, right: 8, bottom: 28, left: 38 };

	let temps = $derived(mode === 'real' ? hourly.temperature_2m : hourly.apparent_temperature);
	let totalHours = $derived(hourly.time.length);

	let validTemps = $derived(temps.filter((t) => t != null));
	let tMin = $derived(Math.floor(Math.min(...validTemps) / 5) * 5 - 5);
	let tMax = $derived(Math.ceil(Math.max(...validTemps) / 5) * 5 + 5);

	// Pan state
	let panOffset = $state(0);

	function render() {
		if (!container) return;

		const width = container.clientWidth;
		const height = 240;
		const innerW = width - margin.left - margin.right;
		const innerH = height - margin.top - margin.bottom;

		// Clear previous
		d3.select(container).select('svg').remove();

		svg = d3.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.style('touch-action', 'pan-y')
			.style('overflow', 'visible');

		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Scales
		const startHour = selectedDay * 24 + panOffset;
		const endHour = startHour + VISIBLE_HOURS;
		const clampedStart = Math.max(0, Math.min(startHour, totalHours - VISIBLE_HOURS));
		const clampedEnd = clampedStart + VISIBLE_HOURS;

		const xScale = d3.scaleLinear()
			.domain([clampedStart, clampedEnd])
			.range([0, innerW]);

		const yTemp = d3.scaleLinear()
			.domain([tMin, tMax])
			.range([innerH, 0]);

		const yPrecip = d3.scaleLinear()
			.domain([0, 100])
			.range([innerH, 0]);

		// Clip path
		g.append('defs')
			.append('clipPath')
			.attr('id', 'chart-clip')
			.append('rect')
			.attr('width', innerW)
			.attr('height', innerH);

		const chartArea = g.append('g')
			.attr('clip-path', 'url(#chart-clip)');

		// Grid lines (temperature)
		for (let v = tMin; v <= tMax; v += 5) {
			g.append('line')
				.attr('x1', 0).attr('x2', innerW)
				.attr('y1', yTemp(v)).attr('y2', yTemp(v))
				.attr('stroke', 'rgba(255,255,255,0.06)')
				.attr('stroke-width', 0.5);
		}

		// Day boundaries
		for (let i = 24; i < totalHours; i += 24) {
			if (i > clampedStart && i < clampedEnd) {
				const x = xScale(i);
				g.append('line')
					.attr('x1', x).attr('x2', x)
					.attr('y1', 0).attr('y2', innerH)
					.attr('stroke', 'rgba(255,255,255,0.12)')
					.attr('stroke-width', 1)
					.attr('stroke-dasharray', '4,4');
			}
		}

		// Precipitation bars
		const barWidth = Math.max(1, innerW / VISIBLE_HOURS * 0.6);
		for (let i = Math.floor(clampedStart); i <= Math.ceil(clampedEnd) && i < totalHours; i++) {
			const prob = hourly.precipitation_probability[i];
			if (prob > 0) {
				chartArea.append('rect')
					.attr('x', xScale(i) - barWidth / 2)
					.attr('y', yPrecip(prob))
					.attr('width', barWidth)
					.attr('height', innerH - yPrecip(prob))
					.attr('fill', 'rgba(90, 160, 255, 0.25)')
					.attr('rx', 1);
			}
		}

		// Temperature area + line
		const visibleData: { i: number; temp: number }[] = [];
		for (let i = Math.max(0, Math.floor(clampedStart) - 1); i <= Math.min(totalHours - 1, Math.ceil(clampedEnd) + 1); i++) {
			if (temps[i] != null) {
				visibleData.push({ i, temp: temps[i] });
			}
		}

		// Gradient for area
		const gradientId = 'temp-gradient';
		const defs = svg.select('defs');
		const gradient = defs.append('linearGradient')
			.attr('id', gradientId)
			.attr('x1', '0').attr('y1', '0')
			.attr('x2', '0').attr('y2', '1');
		gradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(90,200,250,0.4)');
		gradient.append('stop').attr('offset', '40%').attr('stop-color', 'rgba(0,122,255,0.25)');
		gradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,60,120,0.08)');

		// Area
		const area = d3.area<{ i: number; temp: number }>()
			.x(d => xScale(d.i))
			.y0(innerH)
			.y1(d => yTemp(d.temp))
			.curve(d3.curveCatmullRom.alpha(0.5));

		chartArea.append('path')
			.datum(visibleData)
			.attr('d', area)
			.attr('fill', `url(#${gradientId})`);

		// Line
		const line = d3.line<{ i: number; temp: number }>()
			.x(d => xScale(d.i))
			.y(d => yTemp(d.temp))
			.curve(d3.curveCatmullRom.alpha(0.5));

		chartArea.append('path')
			.datum(visibleData)
			.attr('d', line)
			.attr('fill', 'none')
			.attr('stroke', '#5ac8fa')
			.attr('stroke-width', 2.5);

		// Min/Max annotations (visible range only)
		const rangeData = visibleData.filter(d => d.i >= clampedStart && d.i <= clampedEnd);
		if (rangeData.length > 0) {
			const maxD = rangeData.reduce((a, b) => a.temp > b.temp ? a : b);
			const minD = rangeData.reduce((a, b) => a.temp < b.temp ? a : b);

			// Max
			chartArea.append('circle')
				.attr('cx', xScale(maxD.i)).attr('cy', yTemp(maxD.temp))
				.attr('r', 4).attr('fill', '#ffd60a');
			chartArea.append('text')
				.attr('x', xScale(maxD.i)).attr('y', yTemp(maxD.temp) - 16)
				.attr('text-anchor', 'middle')
				.attr('fill', 'rgba(255,214,10,0.85)')
				.attr('font-size', '10px').attr('font-weight', '500')
				.text('Max.');
			chartArea.append('text')
				.attr('x', xScale(maxD.i)).attr('y', yTemp(maxD.temp) - 6)
				.attr('text-anchor', 'middle')
				.attr('fill', 'rgba(255,214,10,0.85)')
				.attr('font-size', '10px').attr('font-weight', '500')
				.text(`${Math.round(maxD.temp)}\u00B0`);

			// Min
			chartArea.append('circle')
				.attr('cx', xScale(minD.i)).attr('cy', yTemp(minD.temp))
				.attr('r', 4).attr('fill', '#5ac8fa');
			chartArea.append('text')
				.attr('x', xScale(minD.i)).attr('y', yTemp(minD.temp) - 16)
				.attr('text-anchor', 'middle')
				.attr('fill', 'rgba(90,200,250,0.85)')
				.attr('font-size', '10px').attr('font-weight', '500')
				.text('Min.');
			chartArea.append('text')
				.attr('x', xScale(minD.i)).attr('y', yTemp(minD.temp) - 6)
				.attr('text-anchor', 'middle')
				.attr('fill', 'rgba(90,200,250,0.85)')
				.attr('font-size', '10px').attr('font-weight', '500')
				.text(`${Math.round(minD.temp)}\u00B0`);
		}

		// Left Y-axis (Temperature)
		const yTempAxis = d3.axisLeft(yTemp)
			.tickValues(d3.range(tMin, tMax + 1, 5))
			.tickFormat(d => `${d}\u00B0`)
			.tickSize(0);

		g.append('g')
			.call(yTempAxis)
			.call(g => g.select('.domain').remove())
			.call(g => g.selectAll('text')
				.attr('fill', 'rgba(255,255,255,0.5)')
				.attr('font-size', '10px')
				.attr('font-family', '-apple-system, sans-serif'));

		// Right Y-axis (Precipitation)
		const precipTicks = [0, 25, 50, 75, 100];
		const rightAxisGroup = svg.append('g');
		for (const v of precipTicks) {
			const absX = margin.left + innerW * 0.82;
			const absY = margin.top + yPrecip(v);
			rightAxisGroup.append('text')
				.attr('x', absX)
				.attr('y', absY)
				.attr('fill', 'rgba(90,160,255,0.7)')
				.attr('font-size', '10px')
				.attr('font-family', '-apple-system, sans-serif')
				.attr('dominant-baseline', 'middle')
				.attr('text-anchor', 'end')
				.text(`${v}%`);
		}

		// X-axis
		const xTicks: number[] = [];
		for (let i = Math.ceil(clampedStart / 6) * 6; i <= clampedEnd; i += 6) {
			if (i >= 0 && i < totalHours) xTicks.push(i);
		}

		const xAxis = d3.axisBottom(xScale)
			.tickValues(xTicks)
			.tickFormat((d) => {
				const idx = d as number;
				if (idx % 24 === 0 && idx < totalHours) {
					const date = new Date(hourly.time[idx]);
					return `${date.getDate()}/${date.getMonth() + 1}`;
				}
				return `${String(idx % 24).padStart(2, '0')}:00`;
			})
			.tickSize(0);

		g.append('g')
			.attr('transform', `translate(0,${innerH})`)
			.call(xAxis)
			.call(g => g.select('.domain').remove())
			.call(g => g.selectAll('text')
				.attr('fill', 'rgba(255,255,255,0.4)')
				.attr('font-size', '10px')
				.attr('font-family', '-apple-system, sans-serif')
				.attr('dy', '12'));

		// Touch/drag panning
		let dragStartX = 0;
		let dragStartOffset = 0;

		const drag = d3.drag<SVGSVGElement, unknown>()
			.on('start', (event) => {
				dragStartX = event.x;
				dragStartOffset = panOffset;
			})
			.on('drag', (event) => {
				const dx = event.x - dragStartX;
				const hoursPerPixel = VISIBLE_HOURS / innerW;
				const newOffset = dragStartOffset - dx * hoursPerPixel;
				const day = selectedDay;
				const absoluteStart = day * 24 + newOffset;
				const maxStart = totalHours - VISIBLE_HOURS;
				panOffset = Math.max(-day * 24, Math.min(newOffset, maxStart - day * 24));
				render();

				// Sync day from pan position
				const centerHour = day * 24 + panOffset + VISIBLE_HOURS / 2;
				const newDay = Math.floor(centerHour / 24);
				const clampedDay = Math.max(0, Math.min(6, newDay));
				if (clampedDay !== selectedDay) {
					onDayChange(clampedDay);
				}
			});

		svg.call(drag);
	}

	export function scrollToDay(dayIndex: number) {
		panOffset = (dayIndex - selectedDay) * 24;
		render();
	}

	onMount(() => {
		render();
	});

	$effect(() => {
		void mode;
		void temps;
		void hourly;
		void selectedDay;
		if (container) render();
	});
</script>

<div bind:this={container} style="margin-top: 0.5rem; height: 240px; cursor: grab; overflow: visible;"></div>
