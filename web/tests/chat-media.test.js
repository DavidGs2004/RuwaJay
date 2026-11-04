import test from 'node:test';
import assert from 'node:assert/strict';
import { chatMediaInfo } from '../src/lib/chatMedia.js';

test('Media from browsers and mobile devices keeps its correct message type', () => {
  for (const [mime, type] of [['audio/webm;codecs=opus','audio'], ['audio/mp4','audio'], ['video/webm;codecs=vp9,opus','video'], ['video/quicktime','video'], ['image/heic','image'], ['image/gif','image']]) {
    const info = chatMediaInfo(new Blob(['media'], { type: mime }));
    assert.equal(info.type, type);
    assert.equal(info.mime, mime.split(';')[0]);
  }
  assert.deepEqual(chatMediaInfo(new File(['video'], 'clip.mp4')), { mime: 'video/mp4', type: 'video' });
  assert.equal(chatMediaInfo(new File(['audio'], 'note.m4a', { type: 'application/octet-stream' })).type, 'audio');
  assert.equal(chatMediaInfo(new Blob(['voice']), true).type, 'audio');
  assert.equal(chatMediaInfo('data:image/png;base64,YQ==').type, 'image');
});

test('Empty, oversized and unsupported files fail before uploading', () => {
  for (const file of [{type:'video/mp4',size:0}, {type:'audio/mp4',size:20*1024*1024+1}, {type:'text/html',size:1}]) {
    assert.throws(() => chatMediaInfo(file));
  }
  assert.equal(chatMediaInfo({type:'video/mp4',size:20*1024*1024}).type, 'video');
});
