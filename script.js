// Biến toàn cục
let products = [];
let filteredProducts = [];
let currentPage = 1;
let pageSize = 10;
let currentSort = { field: 'title', order: 'asc' };

// DOM Elements
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// Hàm chính: Lấy dữ liệu từ API
async function getAllProducts() {
    showLoading();
    hideError();
    
    try {
        const response = await fetch('https://api.escuelajs.co/api/v1/products');
        
        if (!response.ok) {
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        
        products = await response.json();
        
        // Lưu vào localStorage để dùng lại (tùy chọn)
        localStorage.setItem('products_cache', JSON.stringify(products));
        localStorage.setItem('products_cache_time', Date.now());
        
        // Áp dụng filter và sort ban đầu
        applyFilters();
        
        hideLoading();
        renderTable();
        
    } catch (error) {
        hideLoading();
        showError(`Không thể tải dữ liệu: ${error.message}. Đang thử tải từ cache...`);
        
        // Thử tải từ cache nếu có
        loadFromCache();
    }
}

// Tải dữ liệu từ cache (nếu có)
function loadFromCache() {
    const cachedData = localStorage.getItem('products_cache');
    const cacheTime = localStorage.getItem('products_cache_time');
    
    if (cachedData && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        const maxAge = 5 * 60 * 1000; // 5 phút
        
        if (age < maxAge) {
            products = JSON.parse(cachedData);
            applyFilters();
            renderTable();
            return;
        }
    }
    
    showError("Không có dữ liệu cache. Vui lòng kiểm tra kết nối mạng và thử lại.");
}

// Áp dụng tìm kiếm và sắp xếp
function applyFilters() {
    // 1. Áp dụng tìm kiếm
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm) {
        filteredProducts = products.filter(product => 
            product.title.toLowerCase().includes(searchTerm)
        );
    } else {
        filteredProducts = [...products];
    }
    
    // 2. Áp dụng sắp xếp
    sortProducts(filteredProducts);
}

// Sắp xếp sản phẩm
function sortProducts(productArray) {
    productArray.sort((a, b) => {
        let valueA, valueB;
        
        if (currentSort.field === 'title') {
            valueA = a.title.toLowerCase();
            valueB = b.title.toLowerCase();
        } else if (currentSort.field === 'price') {
            valueA = a.price;
            valueB = b.price;
        } else if (currentSort.field === 'id') {
            valueA = a.id;
            valueB = b.id;
        } else {
            return 0;
        }
        
        if (currentSort.order === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });
}

// Render bảng
function renderTable() {
    // Tính toán phân trang
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);
    
    // Xóa nội dung cũ
    tableBody.innerHTML = '';
    
    if (pageProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 48px; color: #bdc3c7; margin-bottom: 15px;"></i>
                    <h3>Không tìm thấy sản phẩm</h3>
                    <p>Thử tìm kiếm với từ khóa khác</p>
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }
    
    // Thêm sản phẩm vào bảng
    pageProducts.forEach(product => {
        const row = document.createElement('tr');
        
        // Xử lý hình ảnh
        const imagesHtml = product.images && product.images.length > 0 
            ? product.images.map(img => `<img src="${img}" alt="${product.title}" class="product-image" loading="lazy">`).join('')
            : '<span class="no-image">Không có ảnh</span>';
        
        // Format giá tiền
        const priceFormatted = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'USD'
        }).format(product.price);
        
        // Tạo description với hover effect
        const descriptionHtml = `
            <div class="description-cell">
                <div class="description-text">${product.description || 'Không có mô tả'}</div>
                <div class="description-full">${product.description || 'Không có mô tả'}</div>
            </div>
        `;
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.title}</td>
            <td>
                <div class="images-container">
                    ${imagesHtml}
                </div>
            </td>
            <td>${priceFormatted}</td>
            <td>${descriptionHtml}</td>
            <td>${product.category?.name || 'N/A'}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    updatePagination();
    updateSortIcons();
}

// Cập nhật phân trang
function updatePagination() {
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    
    // Cập nhật nút Previous
    prevBtn.disabled = currentPage <= 1;
    
    // Cập nhật nút Next
    nextBtn.disabled = currentPage >= totalPages;
    
    // Cập nhật thông tin trang
    if (filteredProducts.length === 0) {
        pageInfo.textContent = 'Không có dữ liệu';
    } else {
        const start = (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, filteredProducts.length);
        pageInfo.textContent = `Hiển thị ${start}-${end} / ${filteredProducts.length} sản phẩm (Trang ${currentPage}/${totalPages})`;
    }
}

// Cập nhật icon sắp xếp
function updateSortIcons() {
    // Xóa tất cả class active trước
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('active');
        const icon = th.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-sort';
        }
    });
    
    // Thêm class active và icon cho cột đang được sắp xếp
    const activeTh = document.querySelector(`[data-sort="${currentSort.field}"]`);
    if (activeTh) {
        activeTh.classList.add('active');
        const icon = activeTh.querySelector('i');
        if (icon) {
            icon.className = currentSort.order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    }
}

// Xử lý sắp xếp khi click vào header
function setupSorting() {
    document.querySelectorAll('[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            
            // Nếu click vào cột đang sắp xếp, đảo ngược thứ tự
            if (field === currentSort.field) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } 
            // Nếu click vào cột khác, đặt order mặc định là asc
            else {
                currentSort.field = field;
                currentSort.order = 'asc';
            }
            
            // Reset về trang 1 khi sắp xếp
            currentPage = 1;
            
            applyFilters();
            renderTable();
        });
    });
}

// Xử lý tìm kiếm
function setupSearch() {
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        
        // Debounce để tránh gọi API/quá nhiều lần render
        searchTimeout = setTimeout(() => {
            currentPage = 1; // Reset về trang 1 khi tìm kiếm
            applyFilters();
            renderTable();
        }, 300);
    });
}

// Xử lý thay đổi số lượng item mỗi trang
function setupPageSize() {
    pageSizeSelect.addEventListener('change', () => {
        pageSize = parseInt(pageSizeSelect.value);
        currentPage = 1; // Reset về trang 1
        renderTable();
    });
}

// Xử lý phân trang
function setupPagination() {
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredProducts.length / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
}

// Hiển thị loading
function showLoading() {
    loadingElement.style.display = 'flex';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

// Hiển thị lỗi
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Khởi tạo dashboard
function initDashboard() {
    setupSorting();
    setupSearch();
    setupPageSize();
    setupPagination();
    getAllProducts();
}

// Chạy khi trang được tải
document.addEventListener('DOMContentLoaded', initDashboard);

// Thêm tính năng refresh dữ liệu
window.addEventListener('online', () => {
    console.log('Đã kết nối mạng, làm mới dữ liệu...');
    getAllProducts();
});

// Export hàm để có thể test
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getAllProducts, applyFilters, sortProducts };
}