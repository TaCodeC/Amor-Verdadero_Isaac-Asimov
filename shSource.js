export const VERTEX_SHADER = `
               attribute vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

export const FRAGMENT_SHADER = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform int u_selectedIndex;
uniform float u_scrollSpeed;
uniform bool u_filtersActive;

#define MAX_CANDIDATES 227
#define LINES_PER_CANDIDATE 12
#define SIDEBAR_WIDTH 0.32
#define TEXT_SIZE 0.012

// Hash functions para generar datos pseudo-aleatorios
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash2D(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Ruido para efectos
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash2D(i);
    float b = hash2D(i + vec2(1.0, 0.0));
    float c = hash2D(i + vec2(0.0, 1.0));
    float d = hash2D(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Patrón de circuitos para el fondo 
float circuitPattern(vec2 uv) {
    vec2 grid = abs(fract(uv * 15.0) - 0.5);
    float line1 = smoothstep(0.02, 0.0, grid.x);
    float line2 = smoothstep(0.02, 0.0, grid.y);
    vec2 nodeGrid = fract(uv * 8.0) - 0.5;
    float nodes = smoothstep(0.15, 0.05, length(nodeGrid));
    float circuit = max(line1, line2) * 0.2 + nodes * 0.8;
    float pulse = sin(u_time * 0.8 + uv.x * 8.0 + uv.y * 12.0) * 0.5 + 0.5;
    circuit *= (0.6 + 0.4 * pulse);
    return circuit;
}

// Genera datos de candidata
vec4 getCandidateData(int index) {
    float f_index = float(index);
    float age = 25.0 + hash(f_index * 1.7) * 15.0;
    float iq = 120.0 + hash(f_index * 2.3) * 50.0;
    float psycho = hash(f_index * 3.1) * hash(f_index * 4.7);
    float compatibility = hash(f_index * 5.9) * 100.0;
    
    // Charity Jones tiene datos especiales
    if (index == 156) {
        age = 28.0;
        iq = 142.0;
        psycho = 0.95;
        compatibility = 98.7;
    }
    
    return vec4(age, iq, psycho, compatibility);
}

// Determina si se descarta una candidata
bool shouldDiscard(vec4 data, int index) {
    if (index == 156) return false; // Charity Jones nunca se descarta
    if (!u_filtersActive) return false;
    if (data.z < 0.5) return true;
    if (data.w < 60.0) return true;
    return hash(float(index) * 7.3) < 0.82;
}

// Renderiza texto simulado 
float renderText(vec2 uv, int candidateIndex, int lineIndex) {
    vec2 textUV = fract(uv / TEXT_SIZE);
    float char = 0.0;
    
    float basePattern = sin(textUV.x * 20.0 + float(lineIndex)) * cos(textUV.y * 15.0 + float(candidateIndex) * 0.1);
    
    if (lineIndex == 6) {
        // Línea separadora
        char = (abs(textUV.y - 0.5) < 0.05) ? 1.0 : 0.0;
    } else if (lineIndex == 7) {
        // Espacio
        char = 0.80;
    } else {
        // Texto normal con variaciones por línea
        float variation = float(lineIndex) * 0.5 + float(candidateIndex) * 0.1;
        char = smoothstep(0.3 + variation * 0.1, 0.7 - variation * 0.1, abs(basePattern));
    }
    
    return char;
}

float createWavyX(vec2 uv) {
    vec2 centered = (uv - 0.5) * 2.0;
    centered.x *= u_resolution.x / u_resolution.y;
    
    // Ondulación
    float wave = sin(uv.y * 15.0 + u_time * 3.0) * 0.05;
    float scanlineWave = sin(uv.y * 100.0 + u_time * 8.0) * 0.02;
    centered.x += wave + scanlineWave;
    
    // Crear la X
    float line1 = abs(centered.x - centered.y);
    float line2 = abs(centered.x + centered.y);
    float thickness = 0.08 + sin(u_time * 2.0) * 0.02; // Grosor pulsante
    
    float x_shape = 0.0;
    x_shape += smoothstep(thickness, thickness * 0.5, line1);
    x_shape += smoothstep(thickness, thickness * 0.5, line2);
    
    // Distorsión de TV antigua
    float distortion = sin(uv.y * 8.0 + u_time * 4.0) * 0.1 + 0.9;
    x_shape *= distortion;
    
    // Ruido de interferencia
    float staticNoise = hash2D(uv + u_time * 0.5) * 0.3;
    x_shape += staticNoise * 0.1;
    
    return clamp(x_shape, 0.0, 1.0);
}

// Corazón para Charity Jones
float createEnhancedHeart(vec2 uv) {
    vec2 centered = (uv - 0.5) * 3.0;
    centered.x *= u_resolution.x / u_resolution.y;
    
    // Latido 
    float heartbeat = sin(u_time * 4.0) * 0.08 + 1.0;
    centered /= heartbeat;
    
    // Ecuación del corazón
    float x = centered.x;
    float y = centered.y + 0.1;
    
    // Corazón principal
    float heart1 = pow(x*x + y*y - 0.3, 3.0) - x*x * y*y*y;
    float heartShape = smoothstep(0.015, -0.015, heart1);
    
    // Brillo interno
    float centerGlow = exp(-length(centered) * 4.0);
    float pulse = sin(u_time * 6.0) * 0.5 + 0.5;
    centerGlow *= pulse;
    
    // Partículas simplificadas 
    float particles = 0.0;
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float angle = u_time * 1.8 + fi * 1.047; // 2*PI/6
        float radius = 0.4 + sin(u_time * 2.0 + fi) * 0.1;
        vec2 particlePos = vec2(
            cos(angle) * radius,
            sin(angle) * radius * 0.8
        );
        float particleSize = 0.025;
        float dist = length(centered - particlePos);
        particles += smoothstep(particleSize, particleSize * 0.3, dist);
    }
    
    // Combinar elementos
    float totalHeart = heartShape + centerGlow * 0.7 + particles * 0.3;
    return clamp(totalHeart, 0.0, 1.0);
}

// Función para renderizar datos de candidatas
vec3 renderCandidateData(vec2 uv, float scrollOffset, bool isLeftSidebar) {
    vec3 color = vec3(0.0);
    
    for (int i = 0; i < MAX_CANDIDATES; i++) {
        // Filtrar por sidebar - izquierda: 0-113, derecha: 114-226
        bool shouldProcess = false;
        if (isLeftSidebar && i < 114) {
            shouldProcess = true;
        } else if (!isLeftSidebar && i >= 114) {
            shouldProcess = true;
        }
        
        if (!shouldProcess) continue;
        
        // Para el sidebar derecho, ajustar el índice para el cálculo de posición Y
        int displayIndex = isLeftSidebar ? i : (i - 114);
        
        float candidateStartY = float(displayIndex * LINES_PER_CANDIDATE) * TEXT_SIZE - scrollOffset;
        float candidateEndY = candidateStartY + float(LINES_PER_CANDIDATE) * TEXT_SIZE;
        
        // Skip si la candidata está completamente fuera de la vista
        if (candidateEndY < -0.1 || candidateStartY > 1.1) continue;
        
        vec4 data = getCandidateData(i);
        bool isDiscarded = shouldDiscard(data, i);
        bool isSelected = (i == u_selectedIndex);
        
        // Colores de texto con opacidad reducida para el scroll
        vec3 textColor = vec3(0.5, 0.7, 0.8); // Azul claro más tenue por defecto
        
        if (isSelected && i == 156) {
            // Charity Jones - texto dorado pulsante
            float goldPulse = sin(u_time * 4.0) * 0.2 + 0.5;
            textColor = vec3(0.8, 0.6, 0.15) * goldPulse;
        } else if (isSelected) {
            // Otra candidata seleccionada - verde pulsante
            float greenPulse = sin(u_time * 3.0) * 0.2 + 0.5;
            textColor = vec3(0.15, 0.8, 0.3) * greenPulse;
        } else if (isDiscarded) {
            // Descartada - rojo parpadeante que se desvanece
            float blink = smoothstep(0.3, 0.7, sin(u_time * 6.0 + float(i) * 0.3));
            textColor = mix(vec3(0.6, 0.08, 0.08), vec3(0.8, 0.3, 0.3), blink);
            // Efecto de desvanecimiento gradual
            float fadeTime = mod(u_time * 0.5 + float(i) * 0.05, 8.0);
            if (fadeTime > 6.0) {
                textColor *= smoothstep(8.0, 6.0, fadeTime);
            }
        }
        
        // Renderizar líneas de esta candidata
        for (int line = 0; line < LINES_PER_CANDIDATE; line++) {
            float lineY = float(displayIndex * LINES_PER_CANDIDATE + line) * TEXT_SIZE - scrollOffset;
            
            // Verificar si la línea está cerca de la posición actual
            if (abs(uv.y - lineY) < TEXT_SIZE * 0.7) {
                float textIntensity = renderText(uv, i, line);
                color = max(color, textColor * textIntensity * 0.6);
            }
        }
    }
    
    return color;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec3 color = vec3(0.0);
    
    // === FONDO: CIRCUITOS ===
    vec2 circuitUV = uv + vec2(u_time * 0.008, u_time * 0.004);
    float circuits = circuitPattern(circuitUV);
    float energyPulse = sin(u_time * 0.4) * 0.3 + 0.8;
    vec3 circuitColor = vec3(0.1, 0.15, 0.3) * circuits * energyPulse * 0.4;
    color = circuitColor;
    
    // === SÍMBOLO CENTRAL ===
    if (u_selectedIndex == 156) {
        // CORAZÓN MEJORADO PARA CHARITY JONES
        float heart = createEnhancedHeart(uv);
        
        // Colores del corazón con gradiente
        vec3 heartColor1 = vec3(1.0, 0.2, 0.4); // Rosa intenso
        vec3 heartColor2 = vec3(1.0, 0.6, 0.8); // Rosa suave
        vec3 heartColor3 = vec3(1.0, 0.9, 0.3); // Dorado
        
        // Mezclar colores basado en la distancia al centro
        float distToCenter = length(uv - 0.5);
        vec3 finalHeartColor = mix(heartColor3, heartColor1, distToCenter * 2.0);
        finalHeartColor = mix(finalHeartColor, heartColor2, sin(u_time * 2.0) * 0.3 + 0.7);
        finalHeartColor *= heart;
        
        // Arcoíris sutil alrededor del corazón
        float angle = atan(uv.y - 0.5, uv.x - 0.5);
        vec3 rainbow = vec3(
            sin(angle * 3.0 + u_time) * 0.5 + 0.5,
            sin(angle * 3.0 + u_time + 2.094) * 0.5 + 0.5,
            sin(angle * 3.0 + u_time + 4.188) * 0.5 + 0.5
        );
        finalHeartColor += rainbow * heart * 0.2;
        
        color = max(color, finalHeartColor);
        
        // "PERFECT MATCH" flotante mejorado
        if (uv.x > 0.25 && uv.x < 0.75 && uv.y > 0.08 && uv.y < 0.22) {
            float matchText = sin((uv.x - 0.5) * 30.0 + u_time * 2.0) *
                            sin((uv.y - 0.15) * 60.0 + u_time * 1.5);
            matchText = smoothstep(0.4, 0.8, abs(matchText));
            float textPulse = sin(u_time * 3.0) * 0.4 + 0.6;
            vec3 matchColor = vec3(1.0, 0.9, 0.3) * matchText * textPulse;
            color = max(color, matchColor);
        }
    } else {
        // X ONDULANTE PARA OTROS CASOS
        float x_symbol = createWavyX(uv);
        vec3 xColor = vec3(0.9, 0.3, 0.1) * x_symbol;
        
        // Efecto de TV antigua - parpadeo
        float tvFlicker = sin(u_time * 12.0) * 0.1 + 0.9;
        xColor *= tvFlicker;
        
        // Líneas de escaneo horizontales
        float scanlines = sin(uv.y * u_resolution.y * 0.5) * 0.1 + 0.9;
        xColor *= scanlines;
        
        color = max(color, xColor);
        
        // "NO MATCH" parpadeante
        if (uv.x > 0.35 && uv.x < 0.65 && uv.y > 0.1 && uv.y < 0.18) {
            float noMatchText = sin((uv.x - 0.5) * 25.0) * sin((uv.y - 0.14) * 50.0);
            noMatchText = smoothstep(0.5, 0.9, abs(noMatchText));
            float blink = smoothstep(0.2, 0.8, sin(u_time * 8.0));
            vec3 noMatchColor = vec3(1.0, 0.2, 0.2) * noMatchText * blink;
            color = max(color, noMatchColor);
        }
    }
    
    // === BARRAS LATERALES CON DATOS (OPTIMIZADAS) ===
    float scrollOffset = u_time * u_scrollSpeed * 0.08;
    
    // Barra izquierda - Primera mitad de candidatas (0-113)
    if (uv.x < SIDEBAR_WIDTH) {
        color = mix(color, vec3(0.03, 0.08, 0.12), 0.85);
        vec3 leftData = renderCandidateData(uv, scrollOffset, true);
        color = max(color, leftData);
        
        // Borde derecho de la barra izquierda
        if (uv.x > SIDEBAR_WIDTH - 0.003) {
            color += vec3(0.1, 0.2, 0.4) * 0.6;
        }
    }
    // Barra derecha - Segunda mitad de candidatas (114-227)
    else if (uv.x > 1.0 - SIDEBAR_WIDTH) {
        color = mix(color, vec3(0.03, 0.08, 0.12), 0.85);
        // Usar el mismo scroll para la barra derecha
        vec3 rightData = renderCandidateData(uv, scrollOffset, false);
        color = max(color, rightData);
        
        // Borde izquierdo de la barra derecha
        if (uv.x < 1.0 - SIDEBAR_WIDTH + 0.003) {
            color += vec3(0.1, 0.2, 0.4) * 0.6;
        }
    }
    
    // === POST-PROCESAMIENTO ===
    // Ruido digital sutil
    float digitalNoise = hash2D(uv + u_time * 0.1) * 0.02;
    color += digitalNoise;
    
    // Viñeta suave
    float vignette = 1.0 - length(uv - 0.5) * 0.5;
    color *= vignette;
    
    // Scanlines globales para efecto retro
    float globalScanlines = sin(uv.y * u_resolution.y * 1.5 + u_time * 2.0) * 0.015;
    color += globalScanlines;
    
    // Efecto de brillo general cuando Charity Jones está seleccionada
    if (u_selectedIndex == 156) {
        float globalGlow = sin(u_time * 1.5) * 0.05 + 0.95;
        color *= globalGlow;
    }
    
    // Corrección gamma
    color = pow(color, vec3(0.85));
    
    gl_FragColor = vec4(color, 1.0);
}`;