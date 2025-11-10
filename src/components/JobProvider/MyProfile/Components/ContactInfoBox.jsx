import React, { useState, useEffect } from 'react';
import Map from '../../../Map';
import { useAuth } from '../../../../../contexts/AuthContext'; // <-- fixed path
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ContactInfoBox = () => {
    const { user, loading } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Prompt login requirement once
    useEffect(() => {
        if (!loading && !user) {
            toast.error('Please log in to use location features.');
        }
    }, [loading, user]);

    const handleSearch = async () => {
        if (!user) {
            toast.error('You must be logged in to search locations.');
            return;
        }
        if (!searchQuery) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_DEV1_API + '/geocode'}?text=${encodeURIComponent(searchQuery)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': import.meta.env.VITE_AWS_LOCATION_API_KEY,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Access denied. Check your API key.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.Results && data.Results.length > 0) {
                const place = data.Results[0].Place;
                const [lng, lat] = place.Geometry.Point;
                setLatitude(lat);
                setLongitude(lng);
                setSelectedLocation({
                    coordinates: [lng, lat],
                    label: place.Label // Keep for showing on map & UI
                });
            } else {
                setError('No results found for this location');
            }
        } catch (err) {
            console.error('Error searching location:', err);
            setError('Failed to search location. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) {
            toast.error('You must be logged in to save locations.');
            return;
        }
        if (!selectedLocation) {
            alert('Please search for a location first');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                firebase_uid: user.uid,
                location: searchQuery.trim(), // <-- use raw user input, trimmed
                latitude,
                langitude: longitude  // match your DB column name
            };

            const response = await fetch(
                'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/mapdata',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );
            const result = await response.json();

            if (response.ok) {
                toast.success('Location saved successfully!');
            } else {
                toast.error(`Save failed: ${result.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Error saving location:', err);
            toast.error(`Save error: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <p>Checking authentication...</p>;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Search Input */}
                <div className="lg:col-span-6">
                    <div className="relative">
                        <input
                            type="text"
                            name="search"
                            placeholder="Find on Map"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            disabled={isLoading || !user}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <span className="absolute top-0 left-0 -translate-y-full bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none transition-opacity duration-200 hover:opacity-100 whitespace-nowrap">
                            Find on Map
                        </span>
                    </div>
                </div>

                {/* Latitude Input */}
                <div className="lg:col-span-3">
                    <div className="relative">
                        <input
                            type="text"
                            name="latitude"
                            placeholder="Latitude"
                            value={latitude}
                            readOnly
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-gray-50 cursor-not-allowed"
                        />
                        <span className="absolute top-0 left-0 -translate-y-full bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none transition-opacity duration-200 hover:opacity-100 whitespace-nowrap">
                            Latitude
                        </span>
                    </div>
                </div>

                {/* Longitude Input */}
                <div className="lg:col-span-3">
                    <div className="relative">
                        <input
                            type="text"
                            name="longitude"
                            placeholder="Longitude"
                            value={longitude}
                            readOnly
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-gray-50 cursor-not-allowed"
                        />
                        <span className="absolute top-0 left-0 -translate-y-full bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none transition-opacity duration-200 hover:opacity-100 whitespace-nowrap">
                            Longitude
                        </span>
                    </div>
                </div>

                {/* Search Button */}
                <div className="lg:col-span-12">
                    <div className="relative">
                        <button
                            type="button"
                            className="px-6 py-3 bg-gradient-brand text-white font-medium rounded-lg hover:bg-gradient-primary-hover focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            onClick={handleSearch}
                            disabled={isLoading || !user}
                        >
                            {isLoading ? 'Searching...' : 'Search Location'}
                        </button>
                        <span className="absolute top-0 left-0 -translate-y-full bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none transition-opacity duration-200 hover:opacity-100 whitespace-nowrap">
                            Search Location
                        </span>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="lg:col-span-12">
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
                            {error}
                        </div>
                    </div>
                )}

                {/* Map */}
                <div className="lg:col-span-12">
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                        <div className="h-96 w-full">
                            <Map
                                initialCenter={selectedLocation?.coordinates}
                                initialZoom={selectedLocation ? 15 : 11}
                                marker={selectedLocation}
                                markerLabel={selectedLocation?.label}
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="lg:col-span-12">
                    <button
                        type="button"
                        className="px-6 py-3 bg-gradient-brand text-white font-medium rounded-lg hover:bg-gradient-primary-hover focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        onClick={handleSave}
                        disabled={!selectedLocation || !user || isSaving}
                    >
                        {isSaving ? 'Saving…' : 'Save Location'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ContactInfoBox;
