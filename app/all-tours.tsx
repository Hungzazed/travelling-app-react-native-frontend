import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getTours, Tour } from '../services/tourService';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AllToursScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const category = params.category as string;
  const searchQueryParam = params.query as string;
  
  const [tours, setTours] = useState<Tour[]>([]);
  const [filteredTours, setFilteredTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchQueryParam || '');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceRange, setPriceRange] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');

  const getCategoryTitle = () => {
    if (category === 'search') {
      return 'Search Results';
    }
    switch (category) {
      case 'top-picks':
        return 'Top Picks';
      case 'group-tours':
        return 'Group Tours';
      default:
        return 'All Tours';
    }
  };

  useEffect(() => {
    loadTours();
  }, [category]);

  useEffect(() => {
    filterTours();
  }, [tours, searchQuery, priceRange, sortBy]);

  const loadTours = async () => {
    try {
      setIsLoading(true);
      const toursData = await getTours({ 
        limit: 100, 
        sortBy: 'createdAt:desc'
      });
      
      let filteredTours = toursData.results;

      // Filter by category
      if (category === 'top-picks') {
        filteredTours = toursData.results.slice(0, 20);
      } else if (category === 'group-tours') {
        filteredTours = toursData.results;
      }

      setTours(filteredTours);
    } catch (error) {
      console.error('Error loading tours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTours = () => {
    let result = [...tours];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        tour =>
          tour.name.toLowerCase().includes(query) ||
          tour.destination.toLowerCase().includes(query)
      );
    }

    // Price range filter
    if (priceRange !== 'all') {
      result = result.filter(tour => {
        const price = tour.pricePerPerson;
        switch (priceRange) {
          case 'low':
            return price < 5000000;
          case 'medium':
            return price >= 5000000 && price < 15000000;
          case 'high':
            return price >= 15000000;
          default:
            return true;
        }
      });
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.pricePerPerson - b.pricePerPerson);
        break;
      case 'price-desc':
        result.sort((a, b) => b.pricePerPerson - a.pricePerPerson);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    setFilteredTours(result);
  };

  const applyFilter = () => {
    setShowFilterModal(false);
    filterTours();
  };

  const resetFilter = () => {
    setPriceRange('all');
    setSortBy('default');
    setShowFilterModal(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTours();
    setRefreshing(false);
  };

  const handleTourPress = (tour: Tour) => {
    const hasHotels = Array.isArray(tour.hotels) && tour.hotels.length > 0;
    if (hasHotels) {
      router.push({ 
        pathname: '/tour-hotel-booking' as any, 
        params: { tourId: tour.id } 
      });
    } else {
      router.push({ 
        pathname: '/tour-detail' as any, 
        params: { id: tour.id } 
      });
    }
  };

  const displayTours = filteredTours.length > 0 ? filteredTours : tours;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getCategoryTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Explore Title */}
      <View style={styles.exploreTitleContainer}>
        <Text style={styles.exploreTitle}>
          Explore <Text style={styles.exploreTitleBold}>{getCategoryTitle()}</Text>
        </Text>
      </View>

      {/* Search and Filter Row */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Here"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <MaterialIcons name="tune" size={24} color="gray" />
          {(priceRange !== 'all' || sortBy !== 'default') && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>

      {/* Category Badge */}
      {category === 'group-tours' && (
        <View style={styles.categoryBadgeContainer}>
          <Ionicons name="square" size={16} color="#FF6B6B" />
          <Text style={styles.categoryBadgeText}>Group Tours</Text>
        </View>
      )}

      {/* Tours List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.toursContainer}>
          {displayTours.map((tour, index) => (
            <TouchableOpacity
              key={tour.id}
              style={styles.tourCard}
              onPress={() => handleTourPress(tour)}
              activeOpacity={0.7}
            >
              {/* Tour Image */}
              <Image
                source={{ uri: tour.images?.[0] || 'https://via.placeholder.com/100x100' }}
                style={styles.tourImage}
              />

              {/* Tour Info */}
              <View style={styles.tourInfo}>
                <Text style={styles.tourName} numberOfLines={1}>
                  {tour.name}
                </Text>
                <View style={styles.tourMeta}>
                  <Ionicons name="people-outline" size={14} color="#999" />
                  <Text style={styles.tourMetaText}>From</Text>
                  <Text style={styles.tourDuration}>{tour.duration}</Text>
                </View>
                
                {/* User Avatars */}
                <View style={styles.avatarsContainer}>
                  <View style={styles.avatarsRow}>
                    <View style={[styles.avatar, styles.avatar1]} />
                    <View style={[styles.avatar, styles.avatar2]} />
                    <View style={[styles.avatar, styles.avatar3]} />
                    <View style={[styles.avatar, styles.avatar4]} />
                  </View>
                </View>
              </View>

              {/* Rating */}
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#FFA500" />
                <Text style={styles.ratingText}>4.5</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty State */}
        {displayTours.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>No tours found</Text>
            <Text style={styles.emptySubText}>
              {searchQuery ? 'Try different keywords' : 'Please try again later'}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lọc & Sắp xếp</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Khoảng giá</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, priceRange === 'all' && styles.filterOptionActive]}
                  onPress={() => setPriceRange('all')}
                >
                  <Text style={[styles.filterOptionText, priceRange === 'all' && styles.filterOptionTextActive]}>
                    Tất cả
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterOption, priceRange === 'low' && styles.filterOptionActive]}
                  onPress={() => setPriceRange('low')}
                >
                  <Text style={[styles.filterOptionText, priceRange === 'low' && styles.filterOptionTextActive]}>
                    {'< 5tr'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterOption, priceRange === 'medium' && styles.filterOptionActive]}
                  onPress={() => setPriceRange('medium')}
                >
                  <Text style={[styles.filterOptionText, priceRange === 'medium' && styles.filterOptionTextActive]}>
                    5tr - 15tr
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterOption, priceRange === 'high' && styles.filterOptionActive]}
                  onPress={() => setPriceRange('high')}
                >
                  <Text style={[styles.filterOptionText, priceRange === 'high' && styles.filterOptionTextActive]}>
                    {'> 15tr'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sắp xếp theo</Text>
              <TouchableOpacity
                style={styles.sortOption}
                onPress={() => setSortBy('default')}
              >
                <Text style={styles.sortOptionText}>Mặc định</Text>
                {sortBy === 'default' && (
                  <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortOption}
                onPress={() => setSortBy('price-asc')}
              >
                <Text style={styles.sortOptionText}>Giá tăng dần</Text>
                {sortBy === 'price-asc' && (
                  <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortOption}
                onPress={() => setSortBy('price-desc')}
              >
                <Text style={styles.sortOptionText}>Giá giảm dần</Text>
                {sortBy === 'price-desc' && (
                  <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortOption}
                onPress={() => setSortBy('name')}
              >
                <Text style={styles.sortOptionText}>Tên A-Z</Text>
                {sortBy === 'name' && (
                  <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilter}
              >
                <Text style={styles.resetButtonText}>Đặt lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilter}
              >
                <Text style={styles.applyButtonText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  exploreTitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  exploreTitle: {
    fontSize: 24,
    color: '#333333',
  },
  exploreTitleBold: {
    fontWeight: '700',
    color: '#000000',
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  categoryBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  categoryBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  toursContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  tourCard: {
    width: (width - 56) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tourImage: {
    width: '100%',
    height: (width - 56) / 2,
    backgroundColor: '#F0F0F0',
  },
  tourInfo: {
    padding: 12,
  },
  tourName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  tourMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  tourMetaText: {
    fontSize: 12,
    color: '#999999',
  },
  tourDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  avatarsContainer: {
    marginTop: 4,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -8,
  },
  avatar1: {
    backgroundColor: '#FF6B6B',
    marginLeft: 0,
  },
  avatar2: {
    backgroundColor: '#4ECDC4',
  },
  avatar3: {
    backgroundColor: '#FFE66D',
  },
  avatar4: {
    backgroundColor: '#95E1D3',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 10,
  },
  sortOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
