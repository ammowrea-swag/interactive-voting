<script>
	import { onMount } from 'svelte';

	// State management
	let pollingLocations = $state([]);
	let userInput = $state('');
	let searchMode = $state('address'); // 'address' or 'zipcode'
	let isSearching = $state(false);
	let error = $state('');
	let results = $state([]);
	let lastRequestTime = $state(0);

	// Load polling locations on mount
	onMount(async () => {
		try {
			const response = await fetch('/data/polling-locations.json');
			pollingLocations = await response.json();
		} catch (err) {
			console.error('Failed to load polling locations:', err);
		}
	});

	// Haversine formula to calculate distance between two points in miles
	function calculateDistance(lat1, lon1, lat2, lon2) {
		const R = 3959; // Earth's radius in miles
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	// Geocode user address using Nominatim
	async function geocodeAddress(address) {
		const encodedAddress = encodeURIComponent(address);
		const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&addressdetails=1&countrycodes=us`;

		const response = await fetch(url, {
			headers: {
				'User-Agent': 'PollingLocationFinder/1.0'
			}
		});

		const data = await response.json();

		if (data.length > 0) {
			return {
				lat: parseFloat(data[0].lat),
				lng: parseFloat(data[0].lon),
				zipCode: data[0].address?.postcode || ''
			};
		}

		return null;
	}

	// Find top 3 nearest locations with zip code prioritization
	function findNearestLocations(userLat, userLng, userZip) {
		const locationsWithDistance = pollingLocations
			.filter((loc) => loc.lat !== null && loc.lng !== null)
			.map((loc) => {
				const actualDistance = calculateDistance(userLat, userLng, loc.lat, loc.lng);
				// Add 10-mile penalty if zip codes don't match
				const adjustedDistance =
					userZip && loc.zipCode && loc.zipCode !== userZip
						? actualDistance + 10
						: actualDistance;

				return {
					...loc,
					actualDistance: actualDistance,
					adjustedDistance: adjustedDistance
				};
			});

		// Sort by adjusted distance and return top 3
		locationsWithDistance.sort((a, b) => a.adjustedDistance - b.adjustedDistance);
		return locationsWithDistance.slice(0, 3);
	}

	// Find locations by zip code only (fallback mode)
	function findLocationsByZip(zipCode) {
		const matchingLocations = pollingLocations
			.filter((loc) => loc.zipCode === zipCode && loc.lat !== null && loc.lng !== null)
			.slice(0, 3);

		// Add distance as 0 for zip-only matches
		return matchingLocations.map((loc) => ({
			...loc,
			actualDistance: 0
		}));
	}

	// Handle search with rate limiting
	async function handleSearch() {
		if (!userInput.trim()) {
			error = 'Please enter an address or zip code';
			return;
		}

		// Rate limiting check
		const now = Date.now();
		const timeSinceLastRequest = now - lastRequestTime;
		if (timeSinceLastRequest < 1000) {
			error = "Hold your horses! We're working on it.";
			return;
		}

		error = '';
		results = [];
		isSearching = true;
		lastRequestTime = now;

		try {
			if (searchMode === 'zipcode') {
				// Zip code only search
				const zipMatch = userInput.trim().match(/^\d{5}$/);
				if (!zipMatch) {
					error = 'Please enter a valid 5-digit zip code';
					isSearching = false;
					return;
				}

				const foundLocations = findLocationsByZip(userInput.trim());
				if (foundLocations.length === 0) {
					error = 'No polling locations found in this zip code. Try address search instead.';
				} else {
					results = foundLocations;
				}
			} else {
				// Address search with geocoding
				const geoData = await geocodeAddress(userInput);

				if (!geoData) {
					error = 'Unable to find this address. Please try again or use zip code search.';
					isSearching = false;
					return;
				}

				const nearestLocations = findNearestLocations(geoData.lat, geoData.lng, geoData.zipCode);
				results = nearestLocations;
			}
		} catch (err) {
			console.error('Search error:', err);
			error = 'An error occurred. Please try again.';
		} finally {
			isSearching = false;
		}
	}

	// Generate Google Maps directions URL
	function getDirectionsUrl(address) {
		return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
	}

	// Toggle search mode
	function toggleSearchMode() {
		searchMode = searchMode === 'address' ? 'zipcode' : 'address';
		error = '';
		results = [];
	}
</script>

<div class="voting-finder">
	<div class="finder-header">
		<h2>Find Your Polling Location</h2>
		<p>Search for the nearest polling locations in Bell, Coryell, Lampasas, or Milam County. Enter your address or just your zip code to see which polling site is closest to you. All residents of a county can vote at whichever polling location they choose, per state law.</p>
	</div>

	<div class="search-controls">
		<div class="search-mode-toggle">
			<button
				type="button"
				class="mode-button"
				class:active={searchMode === 'address'}
				onclick={toggleSearchMode}
			>
				Address
			</button>
			<button
				type="button"
				class="mode-button"
				class:active={searchMode === 'zipcode'}
				onclick={toggleSearchMode}
			>
				Zip Code
			</button>
		</div>

		<div class="search-form">
			<input
				type="text"
				bind:value={userInput}
				placeholder={searchMode === 'address'
					? 'Enter your street address'
					: 'Enter your 5-digit zip code'}
				class="search-input"
				disabled={isSearching}
				onkeydown={(e) => e.key === 'Enter' && handleSearch()}
			/>
			<button
				type="button"
				class="search-button"
				onclick={handleSearch}
				disabled={isSearching || !userInput.trim()}
			>
				{isSearching ? 'Searching...' : 'Find Locations'}
			</button>
		</div>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}
	</div>

	{#if results.length > 0}
		<div class="results">
			<h3>Nearest Polling Locations</h3>
			<div class="location-cards">
				{#each results as location}
					<div class="location-card">
						<h4 class="location-name">{location.name}</h4>
						<p class="location-address">{location.address}</p>
						<div class="location-meta">
							<span class="location-county">{location.county} County</span>
							{#if location.actualDistance > 0}
								<span class="location-distance"
									>{location.actualDistance.toFixed(1)} miles away</span
								>
							{/if}
						</div>
						<a
							href={getDirectionsUrl(location.address)}
							target="_blank"
							rel="noopener noreferrer"
							class="directions-button"
						>
							Get Directions →
						</a>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	@use '../styles/variables' as *;
	@use '../styles/mixins' as *;

	.voting-finder {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--spacing-lg) var(--spacing-md);
	}

	.finder-header {
		text-align: center;
		margin-bottom: var(--spacing-xl);

		h2 {
			font-family: var(--font-family-headline);
			font-size: 2rem;
			color: var(--color-text-primary);
			margin-bottom: var(--spacing-sm);

			@include tablet {
				font-size: 2.5rem;
			}
		}

		p {
			color: var(--color-text-secondary);
			font-size: 1rem;
			max-width: 600px;
			margin: 0 auto;
		}
	}

	.search-controls {
		margin-bottom: var(--spacing-xl);
	}

	.search-mode-toggle {
		display: flex;
		gap: var(--spacing-xs);
		justify-content: center;
		margin-bottom: var(--spacing-md);
	}

	.mode-button {
		padding: var(--spacing-xs) var(--spacing-md);
		border: 2px solid var(--color-accent);
		background: white;
		color: var(--color-accent);
		font-family: var(--font-family-body);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		border-radius: 4px;

		&:hover {
			background: rgba(0, 51, 161, 0.1);
		}

		&.active {
			background: var(--color-accent);
			color: white;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.search-form {
		display: flex;
		gap: var(--spacing-sm);
		max-width: 600px;
		margin: 0 auto;

		@include mobile {
			flex-direction: column;
		}
	}

	.search-input {
		flex: 1;
		padding: var(--spacing-sm) var(--spacing-md);
		border: 2px solid #ddd;
		border-radius: 4px;
		font-family: var(--font-family-body);
		font-size: 1rem;
		transition: border-color 0.2s ease;

		&:focus {
			outline: none;
			border-color: var(--color-accent);
		}

		&:disabled {
			background: #f5f5f5;
			cursor: not-allowed;
		}
	}

	.search-button {
		padding: var(--spacing-sm) var(--spacing-lg);
		background: var(--color-accent);
		color: white;
		border: none;
		border-radius: 4px;
		font-family: var(--font-family-body);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
		white-space: nowrap;

		&:hover:not(:disabled) {
			background: #002b85;
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.error-message {
		max-width: 600px;
		margin: var(--spacing-md) auto 0;
		padding: var(--spacing-sm) var(--spacing-md);
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 4px;
		color: #c33;
		text-align: center;
		font-family: var(--font-family-body);
	}

	.results {
		h3 {
			font-family: var(--font-family-headline);
			font-size: 1.5rem;
			color: var(--color-text-primary);
			margin-bottom: var(--spacing-md);
			text-align: center;
		}
	}

	.location-cards {
		display: grid;
		gap: var(--spacing-md);

		@include tablet {
			grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		}
	}

	.location-card {
		padding: var(--spacing-md);
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		background: white;
		transition: all 0.2s ease;

		&:hover {
			border-color: var(--color-accent);
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		}
	}

	.location-name {
		font-family: var(--font-family-headline);
		font-size: 1.25rem;
		color: var(--color-text-primary);
		margin-bottom: var(--spacing-xs);
	}

	.location-address {
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-sm);
		line-height: 1.5;
	}

	.location-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-md);
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.location-county {
		font-weight: 600;
		color: var(--color-accent);
	}

	.location-distance {
		font-style: italic;
	}

	.directions-button {
		display: inline-block;
		padding: var(--spacing-xs) var(--spacing-md);
		background: var(--color-accent);
		color: white;
		text-decoration: none;
		border-radius: 4px;
		font-weight: 600;
		transition: background-color 0.2s ease;

		&:hover {
			background: #002b85;
		}
	}
</style>
