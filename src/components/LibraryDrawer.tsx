import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Heart, 
  FolderHeart, 
  Download, 
  Clock, 
  Plus, 
  Trash2, 
  Folder, 
  Eye, 
  UploadCloud, 
  UserCheck 
} from 'lucide-react';
import { ResourceItem, Collection, DownloadHistoryItem, ResourceCategory } from '../types/resource';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: ResourceItem[];
  collections: Collection[];
  downloadHistory: DownloadHistoryItem[];
  recentSearches: string[];
  userOwnedResources: ResourceItem[];
  initialTab?: 'favorites' | 'collections' | 'user' | 'downloads' | 'recent';
  onSelectResource: (resource: ResourceItem) => void;
  onRemoveFavorite: (id: string) => void;
  onCreateCollection: (name: string, description: string) => void;
  onDeleteCollection: (id: string) => void;
  onSelectSearchQuery: (query: string) => void;
  onDownloadMultiple: (resources: ResourceItem[]) => void;
  onDownloadSingle?: (resource: ResourceItem) => void;
  onAddUserResource: (resource: ResourceItem) => void;
  onDeleteUserResource: (id: string) => void;
}

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({
  isOpen,
  onClose,
  favorites,
  collections,
  downloadHistory,
  recentSearches,
  userOwnedResources,
  initialTab,
  onSelectResource,
  onRemoveFavorite,
  onCreateCollection,
  onDeleteCollection,
  onSelectSearchQuery,
  onDownloadMultiple,
  onDownloadSingle,
  onAddUserResource,
  onDeleteUserResource
}) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'collections' | 'user' | 'downloads' | 'recent'>(initialTab || 'favorites');

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(collections[0]?.id || null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');

  // Upload own resource states
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCreator, setCustomCreator] = useState('');
  const [customCategory, setCustomCategory] = useState<ResourceCategory>('images');
  const [customUrl, setCustomUrl] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customLicense, setCustomLicense] = useState('CC BY 4.0');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    onCreateCollection(newCollectionName.trim(), newCollectionDesc.trim());
    setNewCollectionName('');
    setNewCollectionDesc('');
    setIsCreatingCollection(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const format = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      let detectedCategory: ResourceCategory = 'images';
      if (file.type.startsWith('audio/')) detectedCategory = 'audio';
      else if (file.type.startsWith('video/')) detectedCategory = 'videos';
      else if (file.type.includes('pdf')) detectedCategory = 'papers';
      else if (file.type.includes('json') || file.type.includes('csv')) detectedCategory = 'datasets';

      const newResource: ResourceItem = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: `User-uploaded ${file.type || 'file'} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        category: detectedCategory,
        thumbnailUrl: file.type.startsWith('image/') ? dataUrl : 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        previewUrl: dataUrl,
        downloadUrl: dataUrl,
        source: {
          providerId: 'user_vault',
          providerName: 'User Vault (Local)',
          resourceUrl: dataUrl
        },
        license: {
          type: 'User Owned Content',
          details: 'Uploaded directly by user.',
          commercialAllowed: true,
          modificationAllowed: true,
          attributionRequired: false,
          verified: true
        },
        creator: {
          name: 'Me (Owner)',
          organization: 'Local Library'
        },
        attributes: {
          format,
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          quality: 'Original'
        },
        verification: {
          metadataVerified: true,
          resourceReachable: true,
          integrityVerified: false
        },
        isUserOwned: true
      };

      onAddUserResource(newResource);
      setIsAddingResource(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddManualResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customUrl.trim()) return;

    const newResource: ResourceItem = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: customTitle.trim(),
      description: customDesc.trim() || 'User-registered open resource.',
      category: customCategory,
      thumbnailUrl: customUrl.trim(),
      previewUrl: customUrl.trim(),
      downloadUrl: customUrl.trim(),
      source: {
        providerId: 'user_vault',
        providerName: 'User Vault (Local)',
        resourceUrl: customUrl.trim()
      },
      license: {
        type: customLicense,
        details: 'User-specified licensing rights.',
        commercialAllowed: !customLicense.includes('NC'),
        modificationAllowed: !customLicense.includes('ND'),
        attributionRequired: true,
        verified: true
      },
      creator: {
        name: customCreator.trim() || 'Independent Author'
      },
      attributes: {
        format: customCategory === 'audio' ? 'MP3' : customCategory === 'videos' ? 'MP4' : 'WEB',
        fileSize: 'User Managed',
        quality: 'Original'
      },
      verification: {
        metadataVerified: true,
        resourceReachable: true,
        integrityVerified: false
      },
      isUserOwned: true
    };

    onAddUserResource(newResource);
    setCustomTitle('');
    setCustomUrl('');
    setCustomDesc('');
    setCustomCreator('');
    setIsAddingResource(false);
  };

  const activeCollection = collections.find((c) => c.id === selectedCollectionId);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderHeart className="h-5 w-5 text-neutral-900" />
              <h2 className="text-lg font-bold text-neutral-900">Resource Library</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-200 px-3 bg-neutral-50/70 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-1.5 py-3 px-2.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'favorites'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Heart className="h-3.5 w-3.5 text-pink-500" />
              <span>Saved ({favorites.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('user')}
              className={`flex items-center gap-1.5 py-3 px-2.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'user'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-amber-500" />
              <span>My Content ({userOwnedResources.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('collections')}
              className={`flex items-center gap-1.5 py-3 px-2.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'collections'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Folder className="h-3.5 w-3.5 text-blue-500" />
              <span>Folders ({collections.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('downloads')}
              className={`flex items-center gap-1.5 py-3 px-2.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'downloads'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Download className="h-3.5 w-3.5 text-emerald-500" />
              <span>History ({downloadHistory.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-1.5 py-3 px-2.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'recent'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-neutral-400" />
              <span>Recent</span>
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* USER-OWNED CONTENT TAB */}
            {activeTab === 'user' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                      User-Owned Resources
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Files you own or custom links added to your workspace
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAddingResource(!isAddingResource)}
                    className="flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Add Resource Panel */}
                {isAddingResource && (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 space-y-3">
                    <h4 className="text-xs font-bold text-neutral-800">Add Own File or Web Asset</h4>
                    
                    {/* File Upload Drop Area */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer border-2 border-dashed border-neutral-300 hover:border-neutral-500 rounded-lg p-3 text-center bg-white transition-colors"
                    >
                      <UploadCloud className="h-6 w-6 text-neutral-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-neutral-700">Click to upload file from device</p>
                      <p className="text-[10px] text-neutral-400">Images, Audio, Video, PDF, CSV, JSON</p>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </div>

                    <div className="text-center text-[11px] font-semibold text-neutral-400">
                      — OR ADD VIA LINK —
                    </div>

                    <form onSubmit={handleAddManualResource} className="space-y-2 text-xs">
                      <input
                        type="text"
                        placeholder="Title (e.g. My Audio Composition)"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900 focus:outline-none"
                        required
                      />
                      <input
                        type="url"
                        placeholder="Direct URL (https://...)"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900 focus:outline-none"
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value as ResourceCategory)}
                          className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900 focus:outline-none"
                        >
                          <option value="images">Image</option>
                          <option value="audio">Audio</option>
                          <option value="videos">Video</option>
                          <option value="papers">Paper / Doc</option>
                          <option value="datasets">Dataset</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Author / Creator"
                          value={customCreator}
                          onChange={(e) => setCustomCreator(e.target.value)}
                          className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900 focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingResource(false)}
                          className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-neutral-900 px-3 py-1 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer"
                        >
                          Save Resource
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {userOwnedResources.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400">
                    <UserCheck className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm font-medium text-neutral-600">No user-owned content yet</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Upload your own files or links to manage them in your unified workspace.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userOwnedResources.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-all"
                      >
                        <div 
                          className="flex items-center gap-3 cursor-pointer overflow-hidden flex-1"
                          onClick={() => onSelectResource(item)}
                        >
                          <img
                            src={item.thumbnailUrl || item.previewUrl}
                            alt={item.title}
                            className="h-12 w-12 rounded-lg object-cover bg-neutral-100 shrink-0"
                          />
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-semibold text-neutral-900 truncate">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-neutral-400 truncate">
                              {item.creator?.name || 'Owner'} · {item.attributes?.format || 'DATA'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => onSelectResource(item)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteUserResource(item.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete user content"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FAVORITES TAB */}
            {activeTab === 'favorites' && (
              <div className="space-y-3">
                {favorites.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400">
                    <Heart className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm font-medium text-neutral-600">No saved items yet</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Click the heart icon on any retrieved resource to pin it here.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                      <span className="text-xs text-neutral-500 font-medium">
                        {favorites.length} saved resources
                      </span>
                      <button
                        onClick={() => onDownloadMultiple(favorites)}
                        className="text-xs font-semibold text-neutral-900 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download All</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {favorites.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-all"
                        >
                          <div 
                            className="flex items-center gap-3 cursor-pointer overflow-hidden flex-1"
                            onClick={() => onSelectResource(item)}
                          >
                            <img
                              src={item.thumbnailUrl || item.previewUrl}
                              alt={item.title}
                              className="h-12 w-12 rounded-lg object-cover bg-neutral-100 shrink-0"
                            />
                            <div className="overflow-hidden">
                              <h4 className="text-xs font-semibold text-neutral-900 truncate">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {item.creator?.name || 'Contributor'} · {item.source?.providerName || 'External'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {onDownloadSingle && (
                              <button
                                onClick={() => onDownloadSingle(item)}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors"
                                title={`Download ${item.title}`}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => onSelectResource(item)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onRemoveFavorite(item.id)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Remove from favorites"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* COLLECTIONS TAB */}
            {activeTab === 'collections' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Your Folders
                  </span>
                  <button
                    onClick={() => setIsCreatingCollection(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:text-blue-600 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Folder</span>
                  </button>
                </div>

                {isCreatingCollection && (
                  <form onSubmit={handleCreate} className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 space-y-2">
                    <input
                      type="text"
                      placeholder="Folder name (e.g. Media Production)"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs text-neutral-900 focus:outline-none"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Optional description"
                      value={newCollectionDesc}
                      onChange={(e) => setNewCollectionDesc(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs text-neutral-900 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCollection(false)}
                        className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 cursor-pointer"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                )}

                <div className="flex flex-wrap gap-2">
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setSelectedCollectionId(col.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                        selectedCollectionId === col.id
                          ? 'bg-neutral-900 text-white shadow-sm'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: col.color }}
                      />
                      <span>{col.name}</span>
                      <span className="opacity-70">({col.resourceIds.length})</span>
                    </button>
                  ))}
                </div>

                {activeCollection && (
                  <div className="pt-2">
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 mb-3">
                      <h4 className="text-sm font-bold text-neutral-900">{activeCollection.name}</h4>
                      {activeCollection.description && (
                        <p className="text-xs text-neutral-500 mt-0.5">{activeCollection.description}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      {activeCollection.resourceIds.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic py-4 text-center">
                          No resources added to this folder yet.
                        </p>
                      ) : (
                        activeCollection.resourceIds.map((resId) => {
                          const item = [...favorites, ...userOwnedResources].find((f) => f.id === resId);
                          if (!item) return null;
                          return (
                            <div
                              key={resId}
                              className="flex items-center justify-between p-2 rounded-lg border border-neutral-200 bg-white"
                            >
                              <div
                                className="flex items-center gap-2.5 flex-1 overflow-hidden cursor-pointer"
                                onClick={() => onSelectResource(item)}
                              >
                                <img
                                  src={item.thumbnailUrl || item.previewUrl}
                                  alt={item.title}
                                  className="h-9 w-9 rounded-md object-cover"
                                />
                                <span className="text-xs font-medium text-neutral-800 truncate">
                                  {item.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {onDownloadSingle && (
                                  <button
                                    onClick={() => onDownloadSingle(item)}
                                    className="p-1 text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                                    title={`Download ${item.title}`}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onSelectResource(item)}
                                  className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                                  title="Preview"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DOWNLOADS HISTORY TAB */}
            {activeTab === 'downloads' && (
              <div className="space-y-3">
                {downloadHistory.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400">
                    <Download className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm font-medium text-neutral-600">No downloads logged yet</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Downloaded media will be recorded here for quick access.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {downloadHistory.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 bg-white text-xs"
                      >
                        <div className="overflow-hidden pr-2">
                          <h5 className="font-semibold text-neutral-900 truncate">
                            {rec.resourceTitle}
                          </h5>
                          <p className="text-[11px] text-neutral-400">
                            {rec.format || 'File'} · {rec.fileSize || 'Standard'} · {rec.downloadedAt}
                          </p>
                        </div>
                        <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium shrink-0">
                          Saved
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RECENT SEARCHES TAB */}
            {activeTab === 'recent' && (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  Recent Search Queries
                </span>
                {recentSearches.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic py-6 text-center">
                    No recent searches yet. Search for any term above.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onSelectSearchQuery(term);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 bg-neutral-50/70 hover:bg-neutral-100 text-xs font-medium text-neutral-700 transition-colors text-left cursor-pointer"
                      >
                        <span className="truncate">{term}</span>
                        <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
