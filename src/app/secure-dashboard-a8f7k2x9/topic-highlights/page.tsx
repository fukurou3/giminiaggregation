'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TopicHighlightConfig {
  id: string;
  title: string;
  postIds: string[];
  order: number;
  isActive: boolean;
}

interface Post {
  id: string;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
}

export default function TopicHighlightsPage() {
  const [highlights, setHighlights] = useState<TopicHighlightConfig[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHighlight, setEditingHighlight] = useState<TopicHighlightConfig | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 新規作成用のフォームデータ
  const [formData, setFormData] = useState({
    title: '',
    postIds: [''],
    order: 0,
    isActive: true
  });

  const loadHighlights = async () => {
    try {
      const highlightsRef = collection(db, 'adminTopicHighlights');
      const highlightsQuery = query(highlightsRef, orderBy('order'));
      const snapshot = await getDocs(highlightsQuery);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TopicHighlightConfig));
      
      setHighlights(data);
    } catch (error) {
      console.error('ハイライト設定の読み込みエラー:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const postsRef = collection(db, 'posts');
      const snapshot = await getDocs(postsRef);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));
      
      setPosts(data);
    } catch (error) {
      console.error('投稿データの読み込みエラー:', error);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadHighlights(),
        loadPosts()
      ]);
    } catch (error) {
      console.error('データの読み込みに失敗しました:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveHighlight = async () => {
    try {
      const id = editingHighlight?.id || Date.now().toString();
      const data = {
        title: formData.title,
        postIds: formData.postIds.filter(id => id.trim()),
        order: formData.order,
        isActive: formData.isActive,
        updatedAt: new Date()
      };

      console.log('Saving highlight data:', data);
      await setDoc(doc(db, 'adminTopicHighlights', id), data);
      console.log('Highlight saved successfully');
      
      await loadHighlights();
      resetForm();
      
      // 成功メッセージを表示
      alert('ハイライトを保存しました！');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました: ' + error);
    }
  };

  const deleteHighlight = async (id: string) => {
    if (!confirm('削除しますか？')) return;
    
    try {
      await deleteDoc(doc(db, 'adminTopicHighlights', id));
      await loadHighlights();
    } catch (error) {
      console.error('削除エラー:', error);
    }
  };

  const startEdit = (highlight: TopicHighlightConfig) => {
    setEditingHighlight(highlight);
    setFormData({
      title: highlight.title,
      postIds: [...highlight.postIds, ''],
      order: highlight.order,
      isActive: highlight.isActive
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingHighlight(null);
    setFormData({
      title: '',
      postIds: [''],
      order: highlights.length,
      isActive: true
    });
    setShowForm(false);
  };

  const addPostIdField = () => {
    setFormData(prev => ({
      ...prev,
      postIds: [...prev.postIds, '']
    }));
  };

  const removePostIdField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      postIds: prev.postIds.filter((_, i) => i !== index)
    }));
  };

  const updatePostId = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      postIds: prev.postIds.map((id, i) => i === index ? value : id)
    }));
  };

  const getPostTitle = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    return post ? post.title : `投稿ID: ${postId}`;
  };

  // デバッグ用: API呼び出しをテスト
  const testApi = async () => {
    try {
      console.log('Testing API...');
      const response = await fetch('/api/admin/topic-highlights');
      const data = await response.json();
      console.log('API Response:', data);
      alert('API Response: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('API Test Error:', error);
      alert('API Test Error: ' + error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">今週のおすすめ管理</h1>
            <p className="text-gray-600 mt-2">ホーム画面に表示される「今週のおすすめ」の内容を設定します</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={testApi}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg shadow-sm text-sm"
            >
              API テスト
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm"
            >
              {showForm ? 'キャンセル' : '新規作成'}
            </button>
          </div>
        </div>

        {/* 作成・編集フォーム */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingHighlight ? 'ハイライト編集' : 'ハイライト作成'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">タイトル</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: AIツール特集"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">作品ID</label>
                <div className="space-y-2">
                  {formData.postIds.map((postId, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={postId}
                        onChange={(e) => updatePostId(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="投稿のドキュメントID"
                      />
                      {postId && (
                        <div className="flex items-center px-3 py-2 bg-gray-100 rounded-md text-sm">
                          {getPostTitle(postId)}
                        </div>
                      )}
                      {formData.postIds.length > 1 && (
                        <button
                          onClick={() => removePostIdField(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addPostIdField}
                  className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
                >
                  + 作品を追加
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">表示順</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium">有効にする</label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveHighlight}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  保存
                </button>
                <button
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ハイライト一覧 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">設定済みハイライト</h2>
          {highlights.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
              <p className="text-gray-500">設定されたハイライトはありません</p>
            </div>
          ) : (
            highlights.map((highlight) => (
              <div key={highlight.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{highlight.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        highlight.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {highlight.isActive ? '有効' : '無効'}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        順序: {highlight.order}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">作品数: {highlight.postIds.length}</p>
                      <div className="space-y-1">
                        {highlight.postIds.map((postId, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{postId}</span>
                            <span className="text-gray-700">{getPostTitle(postId)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEdit(highlight)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm shadow-sm"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => deleteHighlight(highlight.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm shadow-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}