// main.js - Core application logic

// Import modules
import { addDefaultBasemap, basemaps } from './basemaps.js'; 
import { setupLayerControls } from './layer_controls.js'; 
import { initializeLegend, updateLegend, hideLegend } from './legend.js';
import { colorScales } from './color_scales.js'; 
import { loadVectorLayer } from './vector_layers.js';
import { initializeSplitMap } from './split-map.js';
import { createAdminLabelLayers, generateAdminLabels, loadCountryOutline } from './admin_labels.js';
import { InfoPanelManager } from './info_panel_integration.js';

// Global layer storage
export const layers = {
    tiff: {},     // Store TIFF layers
    vector: {},   // Store vector layers
    point: {},    // Store point layer
    countryOutlines: {}, // Store multiple country outlines
    labels: null  // Store label layers
};

// Global reference for info panel manager
let infoPanelManager = null;

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize split map
    const { mainMap, compareMap } = initializeSplitMap('map', 'compare-map', setupMainMap, setupCompareMap, 80);
    
    // Store main map reference globally
    window.map = mainMap;
    
    // Initialize UI components
    initializeLegend();
    setupDropdownToggles();
    
    // Load all country outlines
    await loadAllCountryOutlines(mainMap);
    
    // Initialize admin label layers with multiple outlines
    layers.labels = createAdminLabelLayers(mainMap, layers.vector, layers.countryOutlines, compareMap);
    
    // Setup layer controls
    setupLayerControls(mainMap, layers, colorScales, updateLegend, hideLegend);
    
    // Initialize opacity values display
    setupOpacityDisplays();
    
    // Initialize the Info Panel Manager AFTER everything else is set up
    // Only track the main map (left side) since that's where all the data layers are
    try {
        infoPanelManager = new InfoPanelManager(mainMap, layers);
        
        // Make it globally accessible for the button in admin_labels.js
        window.infoPanelManager = infoPanelManager;
        
        console.log('Info Panel initialized and ready!');
    } catch (error) {
        console.error('Failed to initialize Info Panel:', error);
    }
});

/**
 * Set up the main map with all functionality
 */
function setupMainMap(mapId) {
    const map = L.map(mapId, {
        zoomControl: true,  // We'll remove this in createAdminLabelLayers
        attributionControl: true
    }).setView([7.5707, 44.9962], 5);
    map.attributionControl.setPrefix(' The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.')
    map.attributionControl.setPosition('bottomleft')
    
    console.log('Main Map CRS Information:', {
        mapId: mapId,
        crs: map.options.crs,
        crsCode: map.options.crs.code,
        projection: map.options.crs.projection ? map.options.crs.projection.toString() : 'No projection info'
    });
    
    addDefaultBasemap(map);
    // Add scale bar
    L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 200
    }).addTo(map);

    return map;
}

/**
 * Set up the comparison map with basemap only
 */
function setupCompareMap(mapId) {
    const map = L.map(mapId, {
        zoomControl: false,
        attributionControl: false
    }).setView([7.5707, 44.9962], 5);
    
    basemaps.esriWorldImagery.addTo(map);
    
    return map;
}

/**
 * Load all country outlines
 */
async function loadAllCountryOutlines(map) {
    const countryFiles = {
        somalia: 'data/somalia_outline.geojson',
        kenya: 'data/kenya_outline.geojson',
        south_sudan: 'data/south_sudan_outline.geojson'
    };
    
    // Load all country outlines
    for (const [countryId, filepath] of Object.entries(countryFiles)) {
        try {
            const outline = await loadCountryOutline(countryId, filepath);
            if (outline) {
                layers.countryOutlines[countryId] = outline;
                
                // Add Somalia outline by default (since it was the default before)
                if (countryId === 'somalia') {
                    outline.addTo(map);
                }
            }
        } catch (error) {
            console.error(`Failed to load ${countryId} outline:`, error);
            
            // Fallback: try to load the original cutline.geojson as Somalia outline
            if (countryId === 'somalia') {
                try {
                    const fallbackOutline = await loadCountryOutline('somalia', 'data/cutline.geojson');
                    if (fallbackOutline) {
                        layers.countryOutlines.somalia = fallbackOutline;
                        fallbackOutline.addTo(map);
                        console.log('Loaded fallback outline for Somalia from cutline.geojson');
                    }
                } catch (fallbackError) {
                    console.error('Failed to load fallback outline:', fallbackError);
                }
            }
        }
    }
    
    console.log('Loaded country outlines:', Object.keys(layers.countryOutlines));
}

/**
 * Dropdown menu toggle functionality
 */
function setupDropdownToggles() {
    document.querySelectorAll('.dropdown-btn').forEach(button => {
        button.addEventListener('click', function() {
            this.classList.toggle('active');
            
            const container = this.nextElementSibling;
            if (container && container.classList.contains('dropdown-container')) {
                container.style.display = container.style.display === 'block' ? 'none' : 'block';
            }
        });
    });
}

/**
 * Initialize the opacity value displays
 */
function setupOpacityDisplays() {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        const displayId = slider.id.replace('Opacity', 'OpacityValue');
        const display = document.getElementById(displayId);
        
        if (display) {
            const value = Math.round(slider.value * 100);
            display.textContent = `${value}%`;
        }
    });
}

// Optional: Add keyboard shortcut to toggle the panel
document.addEventListener('keydown', function(e) {
    // Press 'I' key to toggle info panel
    if (e.key === 'i' || e.key === 'I') {
        if (infoPanelManager) {
            infoPanelManager.getInfoPanel().toggle();
        }
    }
});

// Export the infoPanelManager for use in other modules if needed
export { infoPanelManager };