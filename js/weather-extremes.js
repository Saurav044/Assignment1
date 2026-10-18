/* Feature 2: one rainiest recorded day per station, ranked high to low. */
(function (root) {
    'use strict';

    function numberOrNull(value) {
        if (typeof value !== 'number' && typeof value !== 'string') return null;
        if (typeof value === 'string' && value.trim() === '') return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function stationKey(row) {
        return `${String(row.state ?? '').trim()}|${String(row.station ?? '').trim()}`;
    }

    function isoDate(value) {
        if (typeof value !== 'string') return null;
        const match = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(value.trim());
        if (!match) return null;
        const iso = `${match[1]}-${match[2]}-${match[3]}`;
        const date = new Date(`${iso}T00:00:00Z`);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso
            ? iso : null;
    }

    function hasCoordinates(row) {
        const latitude = numberOrNull(row.latitude);
        const longitude = numberOrNull(row.longitude);
        return latitude !== null && longitude !== null
            && latitude > -90 && latitude < 90
            && longitude >= -180 && longitude <= 180;
    }

    function buildPrecipitationRanking(rows) {
        if (!Array.isArray(rows)) throw new TypeError('Expected an array of daily weather records.');
        const wettestByStation = new Map();
        for (const row of rows) {
            if (!row || !String(row.station ?? '').trim() || !hasCoordinates(row)) continue;
            const precipitation = numberOrNull(row.PRCP);
            const date = isoDate(row.date);
            // Zero rainfall is valid. Missing, invalid, and negative readings are not.
            if (precipitation === null || precipitation < 0 || date === null) continue;
            const key = stationKey(row);
            const previous = wettestByStation.get(key);
            if (!previous || precipitation > previous.PRCP
                || (precipitation === previous.PRCP && date < previous.date)) {
                wettestByStation.set(key, {
                    key,
                    station: String(row.station).trim(),
                    state: String(row.state ?? '').trim(),
                    date,
                    latitude: numberOrNull(row.latitude),
                    longitude: numberOrNull(row.longitude),
                    PRCP: precipitation
                });
            }
        }
        return Array.from(wettestByStation.values()).sort((a, b) =>
            b.PRCP - a.PRCP
            || a.state.localeCompare(b.state)
            || a.station.localeCompare(b.station)
            || a.date.localeCompare(b.date)
        );
    }

    function createExplorer({ rows, container = '#precipitation-explorer', onSelect, onReset }) {
        const panel = typeof container === 'string' ? root.document.querySelector(container) : container;
        if (!panel) throw new Error('The precipitation explorer container is missing.');
        const find = selector => {
            const node = panel.querySelector(selector);
            if (!node) throw new Error(`The precipitation panel is missing ${selector}.`);
            return node;
        };
        const next = find('#precipitation-next');
        const resetButton = find('#precipitation-reset');
        const status = find('#precipitation-status');
        const details = find('#precipitation-details');
        const rank = find('#precipitation-rank');
        const station = find('#precipitation-station');
        const date = find('#precipitation-date');
        const amount = find('#precipitation-amount');
        const coordinates = find('#precipitation-coordinates');
        const ranking = buildPrecipitationRanking(rows).slice(0, 100);
        const dateFormat = new Intl.DateTimeFormat('en-US', {
            month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
        });
        const countFormat = new Intl.NumberFormat('en-US');
        let index = -1;

        function showInitialState() {
            details.hidden = true;
            next.disabled = ranking.length === 0;
            resetButton.disabled = true;
            status.textContent = ranking.length
                ? `Top ${countFormat.format(ranking.length)} stations ranked. Choose “Next highest precipitation” to visit the rainiest recorded station.`
                : 'No stations have valid precipitation, date, and location records.';
            panel.dataset.rank = '0';
            panel.dataset.total = String(ranking.length);
        }

        function nextStation() {
            if (index + 1 >= ranking.length) return;
            index += 1;
            const record = ranking[index];
            rank.textContent = `${countFormat.format(index + 1)} / ${countFormat.format(ranking.length)}`;
            station.textContent = `${record.station}, ${record.state}`;
            date.textContent = dateFormat.format(new Date(`${record.date}T00:00:00Z`));
            amount.textContent = `${record.PRCP.toFixed(3)} in`;
            coordinates.textContent = `${Math.abs(record.latitude).toFixed(4)}°${record.latitude < 0 ? 'S' : 'N'}, ${Math.abs(record.longitude).toFixed(4)}°${record.longitude < 0 ? 'W' : 'E'}`;
            details.hidden = false;
            resetButton.disabled = false;
            next.disabled = index === ranking.length - 1;
            panel.dataset.rank = String(index + 1);
            status.textContent = next.disabled
                ? 'You reached the end of the ranking. Reset to start from the highest precipitation again.'
                : `Showing station ${countFormat.format(index + 1)} of ${countFormat.format(ranking.length)}. Choose Next to visit the next station.`;
            if (onSelect) onSelect(record);
        }

        function reset() {
            index = -1;
            showInitialState();
            if (onReset) onReset();
        }

        next.addEventListener('click', nextStation);
        resetButton.addEventListener('click', reset);
        showInitialState();
        return {
            next: nextStation,
            reset,
            getState: () => ({ index, total: ranking.length, current: index >= 0 ? { ...ranking[index] } : null }),
            destroy: () => {
                next.removeEventListener('click', nextStation);
                resetButton.removeEventListener('click', reset);
            }
        };
    }

    const api = { numberOrNull, stationKey, isoDate, hasCoordinates, buildPrecipitationRanking, createExplorer };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.WeatherExtremes = api;
})(typeof window !== 'undefined' ? window : globalThis);
