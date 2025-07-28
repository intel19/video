// === CONFIGURATION ===
const YOUTUBE_API_KEY = 'AIzaSyDG9p1HwVON8xfmRb_Wf-94BtFA5ZX2RLI'; // <-- Replace with your YouTube Data API key
const SUPABASE_URL = 'https://jdciipbleayhybayfsij.supabase.co'; // <-- Replace with your Supabase project URL
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkY2lpcGJsZWF5aHliYXlmc2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NTMxMzEsImV4cCI6MjA2NzEyOTEzMX0.KqweLQRXgZTDVkNreSzA1RhhbrQ_4C-Vp_YXO0i5n9Q'; // <-- Replace with your Supabase anon/public API key
const SUPABASE_TABLE = 'video'; // Table name in Supabase

// === DOM ELEMENTS ===
const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const resultsDiv = document.getElementById('results');
const notificationDiv = document.getElementById('notification');

// Bulk upload elements
const bulkUploadBtn = document.getElementById('bulkUploadBtn');
const bulkKeywordsInput = document.getElementById('bulkKeywords');
const videoCountSelect = document.getElementById('videoCount');
const bulkProgressDiv = document.getElementById('bulkProgress');

// Navigation elements
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const mainTitle = document.getElementById('main-title');

// Video management elements
const refreshVideosBtn = document.getElementById('refreshVideosBtn');
const videoSearchInput = document.getElementById('videoSearchInput');
const videosListDiv = document.getElementById('videosList');
const videoCountSpan = document.getElementById('videoCount');

// Modal elements
const editModal = document.getElementById('editModal');
const deleteModal = document.getElementById('deleteModal');
const editVideoForm = document.getElementById('editVideoForm');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Global variables
let allVideos = [];
let filteredVideos = [];
let currentEditingVideo = null;
let currentDeletingVideo = null;

// === EVENT LISTENERS ===
// Existing event listeners
searchBtn.addEventListener('click', searchYouTube);
keywordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') searchYouTube();
});
bulkUploadBtn.addEventListener('click', startBulkUpload);

// Navigation event listeners
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        switchSection(section);
    });
});

// Video management event listeners
refreshVideosBtn.addEventListener('click', loadAllVideos);
videoSearchInput.addEventListener('input', filterVideos);

// Modal event listeners
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', closeModals);
});

document.querySelectorAll('.btn-cancel').forEach(cancelBtn => {
    cancelBtn.addEventListener('click', closeModals);
});

editVideoForm.addEventListener('submit', saveVideoChanges);
confirmDeleteBtn.addEventListener('click', confirmDeleteVideo);

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModals();
    }
});

// === NAVIGATION FUNCTIONS ===
function switchSection(section) {
    // Update navigation
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });

    // Update content sections
    contentSections.forEach(contentSection => {
        contentSection.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update main title
    if (section === 'search') {
        mainTitle.textContent = 'YouTube Video Admin';
    } else if (section === 'manage') {
        mainTitle.textContent = 'Video Management';
        loadAllVideos(); // Load videos when switching to manage section
    }
}

// === EXISTING FUNCTIONS (unchanged) ===
function showNotification(message, type = 'info') {
    notificationDiv.textContent = message;
    notificationDiv.className = 'notification ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
    notificationDiv.style.display = 'block';
    if (type !== 'error') {
        setTimeout(() => {
            notificationDiv.style.display = 'none';
        }, 2500);
    }
}

function searchYouTube() {
    const keyword = keywordInput.value.trim();
    if (!keyword) {
        showNotification('Please enter a keyword.', 'error');
        return;
    }
    resultsDiv.innerHTML = '<p>Searching...</p>';
    showNotification('Searching YouTube...', 'info');
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(keyword)}&key=${YOUTUBE_API_KEY}`)
        .then(res => res.json())
        .then(data => {
            if (!data.items || data.items.length === 0) {
                resultsDiv.innerHTML = '<p>No videos found.</p>';
                showNotification('No videos found.', 'error');
                return;
            }
            displayResults(data.items);
            showNotification('Videos loaded.', 'success');
        })
        .catch((err) => {
            resultsDiv.innerHTML = '<p>Error fetching videos.</p>';
            showNotification('Error fetching videos from YouTube.', 'error');
            console.error('YouTube API error:', err);
        });
}

function displayResults(videos) {
    resultsDiv.innerHTML = '';
    videos.forEach(video => {
        const videoId = video.id.videoId;
        const title = video.snippet.title;
        const thumbnail = video.snippet.thumbnails.medium.url;
        const url = `https://www.youtube.com/watch?v=${videoId}`;

        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <img src="${thumbnail}" alt="Thumbnail">
            <div class="video-info">
                <div class="video-title">${title}</div>
                <a href="${url}" target="_blank">View on YouTube</a>
            </div>
            <button class="add-btn">Add</button>
        `;
        card.querySelector('.add-btn').addEventListener('click', () => addToSupabase({ title, url, thumbnail }, card));
        resultsDiv.appendChild(card);
    });
}

function addToSupabase(video, card) {
    showNotification('Adding video to Supabase...', 'info');
    fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            title: video.title,
            youtube_url: video.url,
            thumbnail_url: video.thumbnail
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to add video');
        return res.json();
    })
    .then(() => {
        showNotification('Video added to Supabase!', 'success');
        if (card) {
            card.querySelector('.add-btn').disabled = true;
            card.querySelector('.add-btn').textContent = 'Added';
        }
    })
    .catch((err) => {
        showNotification('Error adding video to Supabase.', 'error');
        console.error('Supabase error:', err);
    });
}

// === BULK UPLOAD FUNCTIONS (unchanged) ===
function addProgressItem(message, type = 'info') {
    const item = document.createElement('div');
    item.className = `progress-item progress-${type}`;
    item.textContent = message;
    bulkProgressDiv.appendChild(item);
    bulkProgressDiv.scrollTop = bulkProgressDiv.scrollHeight;
}

function clearProgress() {
    bulkProgressDiv.innerHTML = '';
}

async function searchYouTubeForBulk(keyword, maxResults = 50) {
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(keyword)}&key=${YOUTUBE_API_KEY}`);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return [];
        }
        
        return data.items.map(video => ({
            title: video.snippet.title,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            thumbnail: video.snippet.thumbnails.medium.url
        }));
    } catch (error) {
        console.error('YouTube API error:', error);
        return [];
    }
}

async function addVideoToSupabaseBulk(video) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${SUPABASE_API_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                title: video.title,
                youtube_url: video.url,
                thumbnail_url: video.thumbnail
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add video');
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function startBulkUpload() {
    const keywords = bulkKeywordsInput.value.trim().split('\n').filter(k => k.trim());
    const videosPerKeyword = parseInt(videoCountSelect.value);
    
    if (keywords.length === 0) {
        showNotification('Please enter at least one keyword.', 'error');
        return;
    }
    
    // Disable button and clear previous progress
    bulkUploadBtn.disabled = true;
    bulkUploadBtn.textContent = 'Processing...';
    clearProgress();
    
    let totalVideosAdded = 0;
    let totalErrors = 0;
    
    addProgressItem(`Starting bulk upload for ${keywords.length} keywords, ${videosPerKeyword} videos each...`, 'info');
    
    for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i].trim();
        addProgressItem(`Processing keyword ${i + 1}/${keywords.length}: "${keyword}"`, 'info');
        
        try {
            // Search for videos
            const videos = await searchYouTubeForBulk(keyword, videosPerKeyword);
            
            if (videos.length === 0) {
                addProgressItem(`No videos found for "${keyword}"`, 'error');
                continue;
            }
            
            addProgressItem(`Found ${videos.length} videos for "${keyword}". Adding to database...`, 'info');
            
            // Add videos to database with delay to avoid rate limiting
            for (let j = 0; j < videos.length; j++) {
                try {
                    await addVideoToSupabaseBulk(videos[j]);
                    totalVideosAdded++;
                    
                    // Show progress every 5 videos
                    if ((j + 1) % 5 === 0 || j === videos.length - 1) {
                        addProgressItem(`Added ${j + 1}/${videos.length} videos for "${keyword}"`, 'success');
                    }
                    
                    // Small delay to avoid overwhelming the API
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    totalErrors++;
                    console.error('Error adding video:', error);
                }
            }
            
            addProgressItem(`Completed "${keyword}": ${videos.length} videos processed`, 'success');
            
            // Delay between keywords to be respectful to APIs
            if (i < keywords.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            addProgressItem(`Error processing "${keyword}": ${error.message}`, 'error');
            totalErrors++;
        }
    }
    
    // Final summary
    addProgressItem(`Bulk upload completed! Total videos added: ${totalVideosAdded}, Errors: ${totalErrors}`, 
                   totalErrors === 0 ? 'success' : 'info');
    
    // Re-enable button
    bulkUploadBtn.disabled = false;
    bulkUploadBtn.textContent = 'Start Bulk Upload';
    
    // Show notification
    if (totalVideosAdded > 0) {
        showNotification(`Bulk upload completed! ${totalVideosAdded} videos added successfully.`, 'success');
    } else {
        showNotification('Bulk upload completed, but no videos were added.', 'error');
    }
}

// === VIDEO MANAGEMENT FUNCTIONS ===
async function loadAllVideos() {
    videosListDiv.innerHTML = '<div class="loading">Loading videos...</div>';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch videos');
        }
        
        const videos = await response.json();
        allVideos = videos;
        filteredVideos = videos;
        displayVideosList(videos);
        updateVideoCount(videos.length);
        
    } catch (error) {
        console.error('Error loading videos:', error);
        videosListDiv.innerHTML = `
            <div class="empty-state">
                <h3>Error Loading Videos</h3>
                <p>Failed to load videos from the database. Please try again.</p>
            </div>
        `;
        showNotification('Error loading videos from database.', 'error');
    }
}

function displayVideosList(videos) {
    if (videos.length === 0) {
        videosListDiv.innerHTML = `
            <div class="empty-state">
                <h3>No Videos Found</h3>
                <p>No videos have been added to the database yet.</p>
            </div>
        `;
        return;
    }
    
    videosListDiv.innerHTML = '';
    
    videos.forEach(video => {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
            <img src="${video.thumbnail_url || '/api/placeholder/120/68'}" 
                 alt="Thumbnail" 
                 class="video-thumbnail"
                 onerror="this.src='/api/placeholder/120/68'">
            <div class="video-details">
                <h4 class="video-item-title">${escapeHtml(video.title)}</h4>
                <a href="${video.youtube_url}" target="_blank" class="video-url">${video.youtube_url}</a>
                <div class="video-meta">
                    Added: ${formatDate(video.created_at)}
                    ${video.id ? `• ID: ${video.id}` : ''}
                </div>
            </div>
            <div class="video-actions">
                <button class="btn-edit" onclick="openEditModal(${video.id})">Edit</button>
                <button class="btn-delete" onclick="openDeleteModal(${video.id}, '${escapeHtml(video.title)}')">Delete</button>
            </div>
        `;
        videosListDiv.appendChild(videoItem);
    });
}

function filterVideos() {
    const searchTerm = videoSearchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredVideos = allVideos;
    } else {
        filteredVideos = allVideos.filter(video => 
            video.title.toLowerCase().includes(searchTerm) ||
            video.youtube_url.toLowerCase().includes(searchTerm)
        );
    }
    
    displayVideosList(filteredVideos);
    updateVideoCount(filteredVideos.length);
}

function updateVideoCount(count) {
    const totalCount = allVideos.length;
    if (count === totalCount) {
        videoCountSpan.textContent = `Total Videos: ${totalCount}`;
    } else {
        videoCountSpan.textContent = `Showing ${count} of ${totalCount} videos`;
    }
}

// === MODAL FUNCTIONS ===
function openEditModal(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) {
        showNotification('Video not found.', 'error');
        return;
    }
    
    currentEditingVideo = video;
    
    // Populate form
    document.getElementById('editVideoId').value = video.id;
    document.getElementById('editTitle').value = video.title;
    document.getElementById('editUrl').value = video.youtube_url;
    document.getElementById('editThumbnail').value = video.thumbnail_url || '';
    
    // Show modal
    editModal.classList.add('show');
}

function openDeleteModal(videoId, videoTitle) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) {
        showNotification('Video not found.', 'error');
        return;
    }
    
    currentDeletingVideo = video;
    document.getElementById('deleteVideoTitle').textContent = videoTitle;
    
    // Show modal
    deleteModal.classList.add('show');
}

function closeModals() {
    editModal.classList.remove('show');
    deleteModal.classList.remove('show');
    currentEditingVideo = null;
    currentDeletingVideo = null;
}

async function saveVideoChanges(e) {
    e.preventDefault();
    
    if (!currentEditingVideo) {
        showNotification('No video selected for editing.', 'error');
        return;
    }
    
    const formData = {
        title: document.getElementById('editTitle').value.trim(),
        youtube_url: document.getElementById('editUrl').value.trim(),
        thumbnail_url: document.getElementById('editThumbnail').value.trim()
    };
    
    if (!formData.title || !formData.youtube_url) {
        showNotification('Title and URL are required.', 'error');
        return;
    }
    
    try {
        showNotification('Updating video...', 'info');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${currentEditingVideo.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${SUPABASE_API_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update video');
        }
        
        showNotification('Video updated successfully!', 'success');
        closeModals();
        loadAllVideos(); // Refresh the list
        
    } catch (error) {
        console.error('Error updating video:', error);
        showNotification('Error updating video. Please try again.', 'error');
    }
}

async function confirmDeleteVideo() {
    if (!currentDeletingVideo) {
        showNotification('No video selected for deletion.', 'error');
        return;
    }
    
    try {
        showNotification('Deleting video...', 'info');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${currentDeletingVideo.id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete video');
        }
        
        showNotification('Video deleted successfully!', 'success');
        closeModals();
        loadAllVideos(); // Refresh the list
        
    } catch (error) {
        console.error('Error deleting video:', error);
        showNotification('Error deleting video. Please try again.', 'error');
    }
}

// === UTILITY FUNCTIONS ===
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return 'Invalid Date';
    }
}

// Make functions globally accessible for onclick handlers
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal; 