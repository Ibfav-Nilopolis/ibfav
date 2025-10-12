// main.js - Arquivo JavaScript principal para o site IBFAV

// Aguardar carregamento do DOM
document.addEventListener('DOMContentLoaded', function() {
    initializeSite();
});

// Inicializar o site
function initializeSite() {
    console.log('🔥 Site IBFAV inicializado');
    
    // Verificar se Firebase está disponível
    if (typeof firebase === 'undefined') {
        console.error('Firebase não carregado');
        showFallbackContent();
        return;
    }

    // Carregar dados do Firebase
    loadAgendaData();
    loadGaleriaData();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Aplicar animações
    setupAnimations();
}

// Carregar dados da agenda
async function loadAgendaData() {
    const agendaContainer = document.getElementById('agenda');
    if (!agendaContainer) return;
    
    showLoading('agenda');
    
    try {
        // Buscar eventos futuros
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const snapshot = await db.collection('events')
            .where('date', '>=', today)
            .orderBy('date', 'asc')
            .limit(10)
            .get();

        hideLoading('agenda');

        if (snapshot.empty) {
            showEmptyState('agenda', 'calendar-times', 'Nenhum evento próximo', 'Fique ligado! Novos eventos serão anunciados em breve.');
            return;
        }

        // Limpar container
        agendaContainer.innerHTML = '';
        
        // Adicionar eventos
        snapshot.forEach(doc => {
            const event = doc.data();
            const eventElement = createEventElement(event);
            agendaContainer.appendChild(eventElement);
        });

        // Aplicar animações aos elementos
        animateElements('.agenda-item');

    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
        hideLoading('agenda');
        showErrorState('agenda', 'Erro ao carregar eventos');
    }
}

// Carregar dados da galeria
async function loadGaleriaData() {
    const galeriaContainer = document.getElementById('galeria');
    if (!galeriaContainer) return;
    
    showLoading('galeria');
    
    try {
        const snapshot = await db.collection('photos')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        hideLoading('galeria');

        if (snapshot.empty) {
            showEmptyState('galeria', 'image', 'Nenhuma foto disponível', 'Em breve teremos fotos dos nossos momentos especiais!');
            return;
        }

        // Limpar container
        galeriaContainer.innerHTML = '';
        
        // Adicionar fotos
        snapshot.forEach(doc => {
            const photo = doc.data();
            const photoElement = createPhotoElement(photo);
            galeriaContainer.appendChild(photoElement);
        });

        // Aplicar animações
        animateElements('.galeria-grid img');
        
        // Configurar lazy loading para imagens
        setupLazyLoading();

    } catch (error) {
        console.error('Erro ao carregar galeria:', error);
        hideLoading('galeria');
        showErrorState('galeria', 'Erro ao carregar fotos');
    }
}

// Criar elemento de evento
function createEventElement(event) {
    const eventDate = new Date(event.date + 'T' + event.time);
    const now = new Date();
    const isToday = now.toDateString() === eventDate.toDateString();
    const isUpcoming = eventDate > now;
    
    const li = document.createElement('li');
    li.className = 'agenda-item';
    li.setAttribute('data-event-id', event.id || '');
    
    li.innerHTML = `
        <div class="event-header">
            <h3 class="event-title">
                ${event.title}
                ${isToday ? '<span class="today-badge">• HOJE</span>' : ''}
                ${isUpcoming ? '<span class="upcoming-badge">• PRÓXIMO</span>' : ''}
            </h3>
        </div>
        
        <div class="event-details">
            <div class="event-datetime">
                <i class="fas fa-calendar-alt"></i>
                <span>${formatDate(eventDate)}</span>
                <i class="fas fa-clock"></i>
                <span>${event.time}</span>
            </div>
            
            ${event.location ? `
                <div class="event-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${event.location}</span>
                </div>
            ` : ''}
            
            ${event.description ? `
                <div class="event-description">
                    <i class="fas fa-info-circle"></i>
                    <span>${event.description}</span>
                </div>
            ` : ''}
        </div>
        
        <div class="event-status ${isUpcoming ? 'upcoming' : 'past'}">
            ${isUpcoming ? '🟢 Próximo evento' : '🔴 Evento passado'}
        </div>
    `;
    
    return li;
}

// Criar elemento de foto
function createPhotoElement(photo) {
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.description || 'Foto da Igreja IBFAV';
    img.title = photo.description || '';
    img.className = 'gallery-image';
    img.loading = 'lazy'; // Lazy loading nativo
    
    // Adicionar evento de clique para modal
    img.addEventListener('click', () => openPhotoModal(photo));
    
    // Adicionar atributos para SEO
    img.setAttribute('data-photo-id', photo.id || '');
    if (photo.timestamp) {
        img.setAttribute('data-date', photo.timestamp.toDate().toISOString());
    }
    
    return img;
}

// Abrir modal de foto
function openPhotoModal(photo) {
    // Criar modal se não existir
    let modal = document.getElementById('photoModal');
    if (!modal) {
        modal = createPhotoModal();
        document.body.appendChild(modal);
    }
    
    const modalImg = modal.querySelector('.modal-image');
    const modalCaption = modal.querySelector('.modal-caption');
    const modalDate = modal.querySelector('.modal-date');
    
    modalImg.src = photo.url;
    modalImg.alt = photo.description || 'Foto da Igreja';
    
    if (modalCaption) {
        modalCaption.textContent = photo.description || '';
        modalCaption.style.display = photo.description ? 'block' : 'none';
    }
    
    if (modalDate && photo.timestamp) {
        const date = photo.timestamp.toDate();
        modalDate.textContent = `📅 ${formatDate(date)}`;
        modalDate.style.display = 'block';
    } else if (modalDate) {
        modalDate.style.display = 'none';
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevenir scroll
    
    // Adicionar evento de teclado ESC
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closePhotoModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Criar modal de foto
function createPhotoModal() {
    const modal = document.createElement('div');
    modal.id = 'photoModal';
    modal.className = 'photo-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <img class="modal-image" src="" alt="">
            <div class="modal-info">
                <div class="modal-caption"></div>
                <div class="modal-date"></div>
            </div>
        </div>
        <div class="modal-backdrop"></div>
    `;
    
    // Eventos de fechamento
    modal.querySelector('.modal-close').addEventListener('click', closePhotoModal);
    modal.querySelector('.modal-backdrop').addEventListener('click', closePhotoModal);
    
    return modal;
}

// Fechar modal de foto
function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar scroll
    }
}

// Mostrar estado de loading
function showLoading(section) {
    const loadingElement = document.getElementById(`${section}-loading`);
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
}

// Esconder estado de loading
function hideLoading(section) {
    const loadingElement = document.getElementById(`${section}-loading`);
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// Mostrar estado vazio
function showEmptyState(containerId, iconClass, title, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-${iconClass}"></i>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

// Mostrar estado de erro
function showErrorState(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Oops! Algo deu errado</h3>
            <p>${message}</p>
            <button class="retry-btn" onclick="location.reload()">
                <i class="fas fa-redo"></i> Tentar novamente
            </button>
        </div>
    `;
}

// Mostrar conteúdo de fallback quando Firebase não estiver disponível
function showFallbackContent() {
    console.log('Mostrando conteúdo de fallback');
    
    // Agenda de fallback
    const agendaContainer = document.getElementById('agenda');
    if (agendaContainer) {
        agendaContainer.innerHTML = `
            <li class="agenda-item">
                <h3>Culto de Ensino</h3>
                <div class="event-details">
                    <div class="event-datetime">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Todas as quartas-feiras</span>
                        <i class="fas fa-clock"></i>
                        <span>19:30h</span>
                    </div>
                </div>
            </li>
            <li class="agenda-item">
                <h3>Escola Bíblica</h3>
                <div class="event-details">
                    <div class="event-datetime">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Todos os domingos</span>
                        <i class="fas fa-clock"></i>
                        <span>09:00h</span>
                    </div>
                </div>
            </li>
            <li class="agenda-item">
                <h3>Culto da Família</h3>
                <div class="event-details">
                    <div class="event-datetime">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Todos os domingos</span>
                        <i class="fas fa-clock"></i>
                        <span>18:00h</span>
                    </div>
                </div>
            </li>
        `;
    }
    
    // Galeria de fallback
    const galeriaContainer = document.getElementById('galeria');
    if (galeriaContainer) {
        showEmptyState('galeria', 'image', 'Galeria em manutenção', 'Em breve teremos fotos dos nossos momentos especiais!');
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Formulário de contato
    const form = document.getElementById('form-contato');
    if (form) {
        form.addEventListener('submit', handleContactForm);
    }
    
    // Smooth scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Observer para animações no scroll
    setupScrollAnimations();
    
    // Adicionar efeito ripple aos botões
    setupRippleEffect();
}

// Configurar animações
function setupAnimations() {
    // Animação de entrada para elementos
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observar seções principais
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });
}

// Animar elementos quando entram na viewport
function animateElements(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.6s ease';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Configurar animações no scroll
function setupScrollAnimations() {
    let ticking = false;
    
    function updateScrollAnimations() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.1;
        
        // Parallax suave no header
        const header = document.querySelector('.header');
        if (header) {
            header.style.transform = `translateY(${rate}px)`;
        }
        
        ticking = false;
    }
    
    function requestScrollUpdate() {
        if (!ticking) {
            requestAnimationFrame(updateScrollAnimations);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
}

// Configurar lazy loading para imagens
function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Configurar efeito ripple nos botões
function setupRippleEffect() {
    document.querySelectorAll('.btn, .redes-sociais a').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                left: ${x}px;
                top: ${y}px;
                width: ${size}px;
                height: ${size}px;
                pointer-events: none;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // CSS da animação ripple
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
        .btn, .redes-sociais a {
            position: relative;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);
}

// Manipular formulário de contato
function handleContactForm(e) {
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (submitButton) {
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        submitButton.disabled = true;
        
        // Resetar após 3 segundos (tempo para o FormSubmit processar)
        setTimeout(() => {
            form.reset();
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
            
            // Mostrar mensagem de sucesso
            showNotification('Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');
        }, 3000);
    }
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Adicionar estilos se não existirem
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 400px;
                padding: 15px 20px;
                border-radius: 10px;
                color: white;
                font-weight: 500;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: space-between;
                animation: slideInRight 0.3s ease;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            }
            .notification-success { background: linear-gradient(45deg, #00b894, #00a085); }
            .notification-error { background: linear-gradient(45deg, #ff6b6b, #ee5a24); }
            .notification-info { background: linear-gradient(45deg, #667eea, #764ba2); }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                opacity: 0.8;
                transition: opacity 0.3s;
            }
            .notification-close:hover { opacity: 1; }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove após 5 segundos
    const autoRemove = setTimeout(() => {
        removeNotification(notification);
    }, 5000);
    
    // Evento de fechar manual
    notification.querySelector('.notification-close').addEventListener('click', () => {
        clearTimeout(autoRemove);
        removeNotification(notification);
    });
}

// Remover notificação
function removeNotification(notification) {
    notification.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
    
    // Adicionar animação de saída se não existir
    if (!document.querySelector('#slideout-animation')) {
        const style = document.createElement('style');
        style.id = 'slideout-animation';
        style.textContent = `
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Formatar data para exibição
function formatDate(date) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    return date.toLocaleDateString('pt-BR', options);
}

// Utilitários para performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Detectar se é dispositivo móvel
function isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Otimizações para dispositivos móveis
function optimizeForMobile() {
    if (isMobile()) {
        // Reduzir animações em dispositivos móveis
        document.documentElement.style.setProperty('--animation-duration', '0.3s');
        
        // Desabilitar parallax em dispositivos móveis
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        parallaxElements.forEach(element => {
            element.style.transform = 'none';
        });
    }
}

// Performance monitoring
function trackPagePerformance() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
            
            console.log('🚀 Tempo de carregamento:', loadTime + 'ms');
            
            // Enviar dados para analytics (se configurado)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'page_load_time', {
                    value: loadTime,
                    event_category: 'Performance'
                });
            }
        });
    }
}

// Service Worker para cache (opcional)
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registrado');
                })
                .catch(error => {
                    console.log('❌ Falha ao registrar Service Worker');
                });
        });
    }
}

// Inicializar otimizações
document.addEventListener('DOMContentLoaded', () => {
    optimizeForMobile();
    trackPagePerformance();
    // registerServiceWorker(); // Descomente se quiser usar Service Worker
});

// Exportar funções para uso global
window.IBFAV = {
    loadAgenda: loadAgendaData,
    loadGaleria: loadGaleriaData,
    showNotification,
    openPhotoModal,
    closePhotoModal,
    isMobile,
    formatDate
};

console.log('📱 Site IBFAV carregado com sucesso!');