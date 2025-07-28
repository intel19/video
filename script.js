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

// === EVENT LISTENERS ===
searchBtn.addEventListener('click', searchYouTube);
keywordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') searchYouTube();
});
bulkUploadBtn.addEventListener('click', startBulkUpload);

// === FUNCTIONS ===
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

// === BULK UPLOAD FUNCTIONS ===
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