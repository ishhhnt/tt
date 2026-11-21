/**
 * Cloudflare Worker for IshntShare
 * Supports single & multi-image/video posts, swipeable carousel, Telegram storage, KV & D1.
 */

export default {
  async fetch(request, env) {
    // 1. Credentials (uses env secrets if set, otherwise fallback to hardcoded tokens)
    const BOT_TOKEN = (env && env.BOT_TOKEN) ? env.BOT_TOKEN : "8844690280:AAHQh4evfkvueEEPiisMWkLE-3r57qEKqyA";
    const CHAT_ID = (env && env.CHAT_ID) ? env.CHAT_ID : "-1004343901129";

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ============================================================
    // 1. UPLOAD ROUTE (SINGLE OR MULTIPLE IMAGES / VIDEOS)
    // ============================================================
    if (url.pathname === '/upload' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        
        // Collect all files from both 'files' and 'file' field keys
        const rawFiles = [
          ...(formData.getAll('files') || []),
          ...(formData.getAll('file') || []),
        ];

        // Deduplicate and filter valid files
        const files = [];
        const seen = new Set();
        for (const item of rawFiles) {
          if (item && typeof item === 'object' && typeof item.arrayBuffer === 'function' && item.size > 0) {
            const key = `${item.name || 'file'}_${item.size}`;
            if (!seen.has(key)) {
              seen.add(key);
              files.push(item);
            }
          }
        }

        const username = formData.get('username') || 'Anonymous';
        const uid = formData.get('uid') || 'anonymous';
        const caption = formData.get('caption') || '';
        const tags = formData.get('tags') || '';

        const uniqueId = 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        const fileIds = [];
        const messageIds = [];
        const fileTypes = [];
        const mediaUrls = [];

        // Upload each file to Telegram
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const isVideo = (file.type || '').startsWith('video/');
          const isImage = (file.type || '').startsWith('image/');

          let fileType = isVideo ? 'video' : (isImage ? 'image' : 'document');
          let apiMethod = isVideo ? 'sendVideo' : (isImage ? 'sendPhoto' : 'sendDocument');
          let fieldName = isVideo ? 'video' : (isImage ? 'photo' : 'document');

          const telegramFormData = new FormData();
          telegramFormData.append('chat_id', CHAT_ID);
          telegramFormData.append(fieldName, file, file.name || (isVideo ? `video_${i}.mp4` : `photo_${i}.jpg`));
          telegramFormData.append('caption', `By: ${username} [${i + 1}/${files.length}]`);

          let tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${apiMethod}`, {
            method: 'POST',
            body: telegramFormData
          });
          let tgData = await tgRes.json();

          // Fallback to sendDocument if photo/video upload fails
          if (!tgData.ok) {
            const docFormData = new FormData();
            docFormData.append('chat_id', CHAT_ID);
            docFormData.append('document', file, file.name || `file_${i}`);
            docFormData.append('caption', `By: ${username}`);
            const docRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
              method: 'POST',
              body: docFormData
            });
            const docData = await docRes.json();
            if (docData.ok) {
              tgData = docData;
              fileType = 'image';
            }
          }

          if (tgData.ok && tgData.result) {
            const res = tgData.result;
            messageIds.push(res.message_id);

            let fid = null;
            if (res.photo && res.photo.length) {
              fid = res.photo[res.photo.length - 1].file_id;
            } else if (res.video) {
              fid = res.video.file_id;
            } else if (res.document) {
              fid = res.document.file_id;
            }

            if (fid) {
              fileIds.push(fid);
              fileTypes.push(fileType);
              mediaUrls.push(`/image/${uniqueId}/${i}`);
            }
          }
        }

        // Single primary mediaUrl for backward compatibility
        const primaryMediaUrl = mediaUrls.length > 0 ? mediaUrls[0] : (fileIds.length > 0 ? `/image/${uniqueId}` : null);
        const primaryFileType = fileTypes.length > 0 ? fileTypes[0] : 'text';

        const postRecord = {
          id: uniqueId,
          uid,
          username,
          caption,
          tags,
          fileId: fileIds[0] || null,
          fileIds,
          messageId: messageIds[0] || null,
          messageIds,
          mediaUrl: primaryMediaUrl,
          mediaUrls,
          fileType: primaryFileType,
          fileTypes,
          date: Date.now(),
          comments: []
        };

        // 1. Save to KV (under both uniqueId and post:uniqueId)
        if (env.ISHNTT_KV) {
          try {
            const jsonStr = JSON.stringify(postRecord);
            await env.ISHNTT_KV.put(uniqueId, jsonStr);
            await env.ISHNTT_KV.put(`post:${uniqueId}`, jsonStr);
          } catch (kvErr) {
            console.error('KV save error:', kvErr);
          }
        }

        // 2. Save to D1 (safely wrapped so D1 column mismatches NEVER fail the upload)
        if (env.Db) {
          try {
            await env.Db.prepare(
              "INSERT OR REPLACE INTO posts (id, uid, username, caption, tags, mediaUrl, fileType, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(
              uniqueId, uid, username, caption, tags,
              JSON.stringify(mediaUrls),
              primaryFileType,
              Date.now().toString()
            ).run();
          } catch (d1Err) {
            try {
              await env.Db.prepare(
                "INSERT OR REPLACE INTO posts (id, fileId, messageId, username, uid, caption, tags, mediaUrl, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
              ).bind(
                uniqueId,
                fileIds[0] || '',
                messageIds[0] || 0,
                username, uid, caption, tags,
                JSON.stringify(mediaUrls),
                Date.now().toString()
              ).run();
            } catch (d1FallbackErr) {
              console.warn("D1 save bypassed; post safely stored in KV:", d1FallbackErr.message);
            }
          }
        }

        return new Response(JSON.stringify({
          success: true,
          id: uniqueId,
          mediaUrl: primaryMediaUrl,
          mediaUrls,
          fileType: primaryFileType,
          fileTypes,
          post: postRecord
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // ============================================================
    // 2. GET MEDIA ROUTE (/image/:uniqueId/:index or /image/:id)
    // ============================================================
    if (url.pathname.startsWith('/image/') && request.method === 'GET') {
      const rawPath = url.pathname.replace('/image/', '').trim();
      const parts = rawPath.split('/').filter(Boolean);
      const uniqueId = parts[0];
      const index = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;

      try {
        let fileId = null;

        // Try getting post from KV
        if (env.ISHNTT_KV) {
          let dataStr = await env.ISHNTT_KV.get(uniqueId);
          if (!dataStr) dataStr = await env.ISHNTT_KV.get(`post:${uniqueId}`);
          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              if (Array.isArray(data.fileIds) && data.fileIds.length > 0) {
                fileId = data.fileIds[isNaN(index) ? 0 : Math.min(index, data.fileIds.length - 1)];
              } else if (data.fileId) {
                fileId = data.fileId;
              }
            } catch {}
          }
        }

        // Try getting post from D1
        if (!fileId && env.Db) {
          try {
            const row = await env.Db.prepare("SELECT * FROM posts WHERE id = ?").bind(uniqueId).first();
            if (row) {
              if (row.fileIds) {
                try {
                  const arr = JSON.parse(row.fileIds);
                  if (Array.isArray(arr) && arr.length) {
                    fileId = arr[isNaN(index) ? 0 : Math.min(index, arr.length - 1)];
                  }
                } catch {}
              }
              if (!fileId && row.fileId) fileId = row.fileId;
            }
          } catch {}
        }

        // Fallback: uniqueId itself might be a direct Telegram file_id
        if (!fileId) {
          fileId = uniqueId;
        }

        if (!fileId) {
          return new Response('No media', { status: 404, headers: corsHeaders });
        }

        // Request file info from Telegram
        const pathRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const pathData = await pathRes.json();
        if (!pathData.ok || !pathData.result || !pathData.result.file_path) {
          return new Response('File not found on Telegram', { status: 404, headers: corsHeaders });
        }

        const filePath = pathData.result.file_path;
        const mediaRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);

        let contentType = mediaRes.headers.get('Content-Type');
        if (!contentType || contentType === 'application/octet-stream') {
          if (filePath.endsWith('.mp4')) contentType = 'video/mp4';
          else if (filePath.endsWith('.png')) contentType = 'image/png';
          else if (filePath.endsWith('.webp')) contentType = 'image/webp';
          else contentType = 'image/jpeg';
        }

        return new Response(mediaRes.body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            ...corsHeaders
          }
        });
      } catch (err) {
        return new Response('Media not found', { status: 404, headers: corsHeaders });
      }
    }

    // ============================================================
    // 3. LIST ALL POSTS ROUTE (/list or /posts)
    // ============================================================
    if ((url.pathname === '/list' || url.pathname === '/posts') && request.method === 'GET') {
      try {
        const postsMap = new Map();

        // 1. Fetch from D1
        if (env.Db) {
          try {
            const { results } = await env.Db.prepare("SELECT * FROM posts").all();
            if (results) {
              for (const row of results) {
                let mediaUrls = [];
                let fileTypes = [];
                let comments = [];

                if (row.mediaUrl) {
                  if (row.mediaUrl.startsWith('[')) {
                    try { mediaUrls = JSON.parse(row.mediaUrl); } catch {}
                  } else {
                    mediaUrls = [row.mediaUrl];
                  }
                }
                if (row.imageUrl && !mediaUrls.length) {
                  mediaUrls = [row.imageUrl];
                }
                if (row.fileIds && !mediaUrls.length) {
                  try {
                    const fIds = JSON.parse(row.fileIds);
                    mediaUrls = fIds.map((_, i) => `/image/${row.id}/${i}`);
                  } catch {}
                }
                if (!mediaUrls.length) {
                  mediaUrls = [`/image/${row.id}`];
                }

                if (row.fileTypes) {
                  try { fileTypes = JSON.parse(row.fileTypes); } catch {}
                }
                if (!fileTypes.length) {
                  fileTypes = [row.fileType || 'image'];
                }

                try { comments = JSON.parse(row.comments || '[]'); } catch {}

                postsMap.set(row.id, {
                  id: row.id,
                  uid: row.uid || '',
                  username: row.username || 'Anonymous',
                  caption: row.caption || '',
                  tags: row.tags || '',
                  mediaUrl: mediaUrls[0] || null,
                  mediaUrls,
                  fileType: fileTypes[0] || 'image',
                  fileTypes,
                  date: parseInt(row.date) || Date.now(),
                  comments
                });
              }
            }
          } catch (d1Err) {
            console.warn('D1 list query warning:', d1Err.message);
          }
        }

        // 2. Fetch from KV to get full multi-media data or posts not yet in D1
        if (env.ISHNTT_KV) {
          try {
            const list = await env.ISHNTT_KV.list();
            if (list && list.keys) {
              for (const key of list.keys) {
                if (key.name === 'posts_index') continue;
                const cleanId = key.name.startsWith('post:') ? key.name.replace('post:', '') : key.name;
                const dataStr = await env.ISHNTT_KV.get(key.name);
                if (dataStr) {
                  try {
                    const post = JSON.parse(dataStr);
                    const id = post.id || cleanId;
                    const mediaUrls = Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0
                      ? post.mediaUrls
                      : (post.mediaUrl ? [post.mediaUrl] : [`/image/${id}`]);

                    const fileTypes = Array.isArray(post.fileTypes) && post.fileTypes.length > 0
                      ? post.fileTypes
                      : [post.fileType || 'image'];

                    postsMap.set(id, {
                      id,
                      uid: post.uid || '',
                      username: post.username || 'Anonymous',
                      caption: post.caption || '',
                      tags: post.tags || '',
                      mediaUrl: mediaUrls[0] || null,
                      mediaUrls,
                      fileType: fileTypes[0] || 'image',
                      fileTypes,
                      date: typeof post.date === 'number' ? post.date : (parseInt(post.date) || Date.now()),
                      comments: post.comments || [],
                      messageIds: post.messageIds || (post.messageId ? [post.messageId] : []),
                      fileIds: post.fileIds || (post.fileId ? [post.fileId] : []),
                    });
                  } catch {}
                }
              }
            }
          } catch (kvErr) {
            console.warn('KV list warning:', kvErr.message);
          }
        }

        const images = Array.from(postsMap.values());
        images.sort((a, b) => b.date - a.date);

        return new Response(JSON.stringify({ success: true, images }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // ============================================================
    // 4. DELETE POST ROUTE (/delete/:id)
    // ============================================================
    if (url.pathname.startsWith('/delete/') && (request.method === 'DELETE' || request.method === 'POST')) {
      const uniqueId = url.pathname.replace('/delete/', '').trim();
      try {
        const messageIds = [];

        // 1. Delete from KV
        if (env.ISHNTT_KV) {
          let dataStr = await env.ISHNTT_KV.get(uniqueId);
          if (!dataStr) dataStr = await env.ISHNTT_KV.get(`post:${uniqueId}`);
          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              if (Array.isArray(data.messageIds)) messageIds.push(...data.messageIds);
              else if (data.messageId) messageIds.push(data.messageId);
            } catch {}
          }
          await env.ISHNTT_KV.delete(uniqueId);
          await env.ISHNTT_KV.delete(`post:${uniqueId}`);
        }

        // 2. Delete from D1
        if (env.Db) {
          try {
            await env.Db.prepare("DELETE FROM posts WHERE id = ?").bind(uniqueId).run();
          } catch {}
        }

        // 3. Delete all messages from Telegram channel
        const uniqueMsgIds = [...new Set(messageIds.filter(Boolean))];
        for (const mId of uniqueMsgIds) {
          try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: CHAT_ID, message_id: mId })
            });
          } catch {}
        }

        return new Response(JSON.stringify({ success: true, id: uniqueId }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // ============================================================
    // 5. COMMENT ROUTE (/comment/:id)
    // ============================================================
    if (url.pathname.startsWith('/comment/') && request.method === 'POST') {
      const uniqueId = url.pathname.replace('/comment/', '').trim();
      try {
        const body = await request.json();
        const newComment = {
          id: 'cm_' + Date.now(),
          username: body.username || 'Anonymous',
          text: body.text || '',
          date: Date.now()
        };

        let comments = [];

        if (env.ISHNTT_KV) {
          let dataStr = await env.ISHNTT_KV.get(uniqueId);
          if (!dataStr) dataStr = await env.ISHNTT_KV.get(`post:${uniqueId}`);
          if (dataStr) {
            const data = JSON.parse(dataStr);
            data.comments = data.comments || [];
            data.comments.push(newComment);
            comments = data.comments;
            await env.ISHNTT_KV.put(uniqueId, JSON.stringify(data));
            await env.ISHNTT_KV.put(`post:${uniqueId}`, JSON.stringify(data));
          }
        }

        if (env.Db) {
          try {
            await env.Db.prepare("UPDATE posts SET comments = ? WHERE id = ?").bind(JSON.stringify(comments), uniqueId).run();
          } catch {}
        }

        return new Response(JSON.stringify({ success: true, comments }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
