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

	const VISIBLE_HOURS = 28;
	const margin = { top: 16, right: 8, bottom: 28, left: 38 };

	let temps = $derived(mode === 'real' ? hourly.temperature_2m : hourly.apparent_temperature);
	let totalHours = $derived(hourly.time.length);
	// Limit to hours that have valid data
	let validHourCount = $derived.by(() => {
		let last = 0;
		for (let i = temps.length - 1; i >= 0; i--) {
			if (temps[i] != null) { last = i + 1; break; }
		}
		return last;
	});

	let validTemps = $derived(temps.filter((t) => t != null));
	let tMin = $derived(validTemps.length > 0 ? Math.floor(Math.min(...validTemps) / 5) * 5 - 5 : 0);
	let tMax = $derived(validTemps.length > 0 ? Math.ceil(Math.max(...validTemps) / 5) * 5 + 5 : 40);

	// Current pan position in hours (absolute, 0 = start of data)
	let viewStart = $state(0);

	// Refs for D3 elements that get updated on pan
	let dataGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
	let xScaleRef: d3.ScaleLinear<number, number>;
	let innerWRef = 0;
	let builtForMode = '';

	// Refs for Min/Max annotations
	let allDataRef: { i: number; temp: number }[] = [];
	let yTempRef: d3.ScaleLinear<number, number>;
	let xFullRef: d3.ScaleLinear<number, number>;
	let minMaxGroupRef: d3.Selection<SVGGElement, unknown, null, undefined>;

	function updateMinMax(day: number) {
		if (!minMaxGroupRef || !xFullRef || !yTempRef) return;
		minMaxGroupRef.selectAll('*').remove();

		const dayStart = day * 24;
		const dayEnd = Math.min(dayStart + 24, validHourCount);
		const dayData = allDataRef.filter(d => d.i >= dayStart && d.i < dayEnd);
		if (dayData.length === 0) return;

		const maxD = dayData.reduce((a, b) => a.temp > b.temp ? a : b);
		const minD = dayData.reduce((a, b) => a.temp < b.temp ? a : b);

		// Max
		minMaxGroupRef.append('circle')
			.attr('cx', xFullRef(maxD.i)).attr('cy', yTempRef(maxD.temp))
			.attr('r', 4).attr('fill', '#ffd60a');
		minMaxGroupRef.append('text')
			.attr('x', xFullRef(maxD.i)).attr('y', yTempRef(maxD.temp) - 16)
			.attr('text-anchor', 'middle').attr('fill', 'rgba(255,214,10,0.85)')
			.attr('font-size', '10px').attr('font-weight', '500').text('Max.');
		minMaxGroupRef.append('text')
			.attr('x', xFullRef(maxD.i)).attr('y', yTempRef(maxD.temp) - 6)
			.attr('text-anchor', 'middle').attr('fill', 'rgba(255,214,10,0.85)')
			.attr('font-size', '10px').attr('font-weight', '500').text(`${Math.round(maxD.temp)}\u00B0`);

		// Min
		minMaxGroupRef.append('circle')
			.attr('cx', xFullRef(minD.i)).attr('cy', yTempRef(minD.temp))
			.attr('r', 4).attr('fill', '#5ac8fa');
		minMaxGroupRef.append('text')
			.attr('x', xFullRef(minD.i)).attr('y', yTempRef(minD.temp) - 16)
			.attr('text-anchor', 'middle').attr('fill', 'rgba(90,200,250,0.85)')
			.attr('font-size', '10px').attr('font-weight', '500').text('Min.');
		minMaxGroupRef.append('text')
			.attr('x', xFullRef(minD.i)).attr('y', yTempRef(minD.temp) - 6)
			.attr('text-anchor', 'middle').attr('fill', 'rgba(90,200,250,0.85)')
			.attr('font-size', '10px').attr('font-weight', '500').text(`${Math.round(minD.temp)}\u00B0`);
	}

	function buildChart() {
		if (!container) return;

		const width = container.clientWidth;
		const height = 240;
		const innerW = width - margin.left - margin.right;
		const innerH = height - margin.top - margin.bottom;
		innerWRef = innerW;

		// Clear previous
		d3.select(container).select('svg').remove();

		const svg = d3.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.style('touch-action', 'none')
			.style('overflow', 'visible');

		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Pixel scale: maps hour index to pixel position in the FULL data space
		const pixelsPerHour = innerW / VISIBLE_HOURS;
		const totalPixelWidth = validHourCount * pixelsPerHour;

		// The x-scale maps hours to pixels (full range)
		const xFull = d3.scaleLinear()
			.domain([0, validHourCount])
			.range([0, totalPixelWidth]);
		xScaleRef = xFull;

		const yTemp = d3.scaleLinear()
			.domain([tMin, tMax])
			.range([innerH, 0]);

		const yPrecip = d3.scaleLinear()
			.domain([0, 100])
			.range([innerH, 0]);

		// Clip path for the chart area
		g.append('defs')
			.append('clipPath')
			.attr('id', 'chart-clip')
			.append('rect')
			.attr('width', innerW)
			.attr('height', innerH + margin.top + 5)
			.attr('y', -margin.top);

		// Static elements (don't move with pan)

		// Grid lines (temperature)
		for (let v = tMin; v <= tMax; v += 5) {
			g.append('line')
				.attr('x1', 0).attr('x2', innerW)
				.attr('y1', yTemp(v)).attr('y2', yTemp(v))
				.attr('stroke', 'rgba(255,255,255,0.06)')
				.attr('stroke-width', 0.5);
		}

		// Left Y-axis (Temperature)
		const yTempAxis = d3.axisLeft(yTemp)
			.tickValues(d3.range(tMin, tMax + 1, 5))
			.tickFormat(d => `${d}\u00B0`)
			.tickSize(0);

		g.append('g')
			.call(yTempAxis)
			.call(sel => sel.select('.domain').remove())
			.call(sel => sel.selectAll('text')
				.attr('fill', 'rgba(255,255,255,0.5)')
				.attr('font-size', '10px')
				.attr('font-family', '-apple-system, sans-serif'));

		// Right Y-axis (Precipitation %) - inside chart at ~82%
		const precipTicks = [0, 25, 50, 75, 100];
		for (const v of precipTicks) {
			g.append('text')
				.attr('x', innerW * 0.82)
				.attr('y', yPrecip(v))
				.attr('fill', 'rgba(90,160,255,0.55)')
				.attr('font-size', '10px')
				.attr('font-family', '-apple-system, sans-serif')
				.attr('dominant-baseline', 'middle')
				.attr('text-anchor', 'end')
				.text(`${v}%`);
		}

		// Clipped group for scrollable content
		const clippedGroup = g.append('g')
			.attr('clip-path', 'url(#chart-clip)');

		// Data group — this gets translated on pan
		dataGroup = clippedGroup.append('g');

		// Temperature color function: blue (cold) → orange (warm)
		function tempColor(t: number): string {
			const stops: [number, number[]][] = [
				[0, [60, 130, 230]], [10, [90, 200, 250]], [18, [100, 210, 180]],
				[24, [255, 200, 50]], [30, [255, 149, 0]], [38, [255, 59, 48]],
			];
			if (t <= stops[0][0]) return `rgb(${stops[0][1]})`;
			if (t >= stops[stops.length - 1][0]) return `rgb(${stops[stops.length - 1][1]})`;
			for (let j = 0; j < stops.length - 1; j++) {
				const [t0, c0] = stops[j];
				const [t1, c1] = stops[j + 1];
				if (t >= t0 && t <= t1) {
					const f = (t - t0) / (t1 - t0);
					return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f))})`;
				}
			}
			return 'rgb(90,200,250)';
		}

		const defs = svg.select('defs');

		// === Draw ALL data into dataGroup (full 7-day range) ===

		// Temperature data points
		const allData: { i: number; temp: number }[] = [];
		for (let i = 0; i < validHourCount; i++) {
			if (temps[i] != null) allData.push({ i, temp: temps[i] });
		}

		// Temperature area fill — per-segment colored by temperature
		for (let j = 0; j < allData.length - 1; j++) {
			const d0 = allData[j];
			const d1 = allData[j + 1];
			const col = tempColor((d0.temp + d1.temp) / 2);
			const segArea = d3.area<{ i: number; temp: number }>()
				.x(d => xFull(d.i)).y0(innerH).y1(d => yTemp(d.temp)).curve(d3.curveLinear);
			dataGroup.append('path')
				.datum([d0, d1]).attr('d', segArea)
				.attr('fill', col).attr('opacity', 0.18);
		}

		// Precipitation bars (more visible)
		const barWidth = Math.max(2, pixelsPerHour * 0.5);
		for (let i = 0; i < validHourCount; i++) {
			const prob = hourly.precipitation_probability[i];
			if (prob > 0) {
				const opacity = 0.2 + (prob / 100) * 0.4;
				dataGroup.append('rect')
					.attr('x', xFull(i) - barWidth / 2)
					.attr('y', yPrecip(prob))
					.attr('width', barWidth)
					.attr('height', innerH - yPrecip(prob))
					.attr('fill', `rgba(80, 140, 255, ${opacity})`)
					.attr('stroke', 'rgba(100, 170, 255, 0.35)')
					.attr('stroke-width', 0.5)
					.attr('rx', 1);
			}
		}

		// Temperature line gradient (horizontal, color changes with temp)
		const lineGradId = 'temp-line-grad';
		const lineGrad = defs.append('linearGradient')
			.attr('id', lineGradId)
			.attr('gradientUnits', 'userSpaceOnUse')
			.attr('x1', xFull(0)).attr('y1', 0)
			.attr('x2', xFull(validHourCount)).attr('y2', 0);
		for (const d of allData) {
			lineGrad.append('stop')
				.attr('offset', `${((d.i / validHourCount) * 100).toFixed(1)}%`)
				.attr('stop-color', tempColor(d.temp));
		}

		// Temperature line
		const line = d3.line<{ i: number; temp: number }>()
			.x(d => xFull(d.i)).y(d => yTemp(d.temp))
			.curve(d3.curveCatmullRom.alpha(0.5));

		dataGroup.append('path')
			.datum(allData).attr('d', line)
			.attr('fill', 'none')
			.attr('stroke', `url(#${lineGradId})`)
			.attr('stroke-width', 2.5);

		// Day boundary lines
		for (let i = 24; i < validHourCount; i += 24) {
			dataGroup.append('line')
				.attr('x1', xFull(i)).attr('x2', xFull(i))
				.attr('y1', -margin.top).attr('y2', innerH)
				.attr('stroke', 'rgba(255,255,255,0.12)')
				.attr('stroke-width', 1)
				.attr('stroke-dasharray', '4,4');
		}

		// Min/Max annotation group — updated when selected day changes
		const minMaxGroup = dataGroup.append('g').attr('class', 'minmax-annotations');
		allDataRef = allData;
		yTempRef = yTemp;
		xFullRef = xFull;
		minMaxGroupRef = minMaxGroup;
		updateMinMax(selectedDay);

		// X-axis tick labels (inside data group so they scroll)
		for (let i = 0; i < validHourCount; i += 6) {
			let label: string;
			if (i % 24 === 0) {
				const date = new Date(hourly.time[i]);
				label = `${date.getDate()}/${date.getMonth() + 1}`;
			} else {
				label = `${String(i % 24).padStart(2, '0')}:00`;
			}
			dataGroup.append('text')
				.attr('x', xFull(i))
				.attr('y', innerH + 16)
				.attr('text-anchor', 'middle')
				.attr('fill', 'rgba(255,255,255,0.4)')
				.attr('font-size', '10px')
				.attr('font-family', '-apple-system, sans-serif')
				.text(label);
		}

		// Set initial pan position
		updatePanPosition(viewStart);

		// Drag behavior
		let dragStartX = 0;
		let dragStartViewStart = 0;

		const drag = d3.drag<SVGSVGElement, unknown>()
			.on('start', (event) => {
				dragStartX = event.x;
				dragStartViewStart = viewStart;
			})
			.on('drag', (event) => {
				const dx = event.x - dragStartX;
				const hoursPerPixel = VISIBLE_HOURS / innerW;
				const newStart = dragStartViewStart - dx * hoursPerPixel;
				const maxStart = Math.max(0, validHourCount - VISIBLE_HOURS);
				viewStart = Math.max(0, Math.min(newStart, maxStart));

				updatePanPosition(viewStart);

				// Sync day from center of view
				const centerHour = viewStart + VISIBLE_HOURS / 2;
				const newDay = Math.floor(centerHour / 24);
				const maxDay = Math.ceil(validHourCount / 24) - 1;
				const clampedDay = Math.max(0, Math.min(maxDay, newDay));
				if (clampedDay !== selectedDay) {
					onDayChange(clampedDay);
					updateMinMax(clampedDay);
				}
			});

		svg.call(drag);
		builtForMode = mode;
	}

	function updatePanPosition(startHour: number) {
		if (!dataGroup || !xScaleRef) return;
		const translateX = -xScaleRef(startHour);
		dataGroup.attr('transform', `translate(${translateX},0)`);
	}

	export function scrollToDay(dayIndex: number) {
		const maxStart = Math.max(0, validHourCount - VISIBLE_HOURS);
		viewStart = Math.max(0, Math.min(dayIndex * 24, maxStart));
		updatePanPosition(viewStart);
		updateMinMax(dayIndex);
	}

	onMount(() => {
		buildChart();
	});

	// Rebuild chart when mode or data changes, but NOT on selectedDay change
	$effect(() => {
		void mode;
		void temps;
		void hourly;
		if (container && builtForMode !== '') {
			buildChart();
		}
	});
</script>

<div bind:this={container} style="margin-top: 0.5rem; height: 240px; cursor: grab; overflow: visible;"></div>
