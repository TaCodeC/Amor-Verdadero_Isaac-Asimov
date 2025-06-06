import { VERTEX_SHADER, FRAGMENT_SHADER } from "./shSource.js";
class AsimovShaderSystem {
  constructor() {
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.uniforms = {};
    this.startTime = Date.now();

    // Variables de control
    this.scrollSpeed = 1.0;
    this.selectedIndex = 156; // Charity Jones
    this.filtersActive = true;
    this.processedCount = 0;
    this.discardedCount = 0;
    this.isRunning = false;

    // Datos de candidatas (simulados)
    this.candidates = this.generateCandidateDatabase();

    // Control de animación
    this.animationId = null;
    this.lastTime = 0;

    this.init();
  }

  init() {
    try {
      this.canvas = document.getElementById("glCanvas");
      this.gl =
        this.canvas.getContext("webgl") ||
        this.canvas.getContext("experimental-webgl");

      if (!this.gl) {
        throw new Error("WebGL no soportado");
      }

      this.setupCanvas();
      this.setupShaders();
      this.setupUniforms();
      this.setupEventListeners();
      this.startAnimation();

      console.log("✅ Sistema MULTIVAC/Joe v2.1 iniciado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando sistema:", error);
      this.showError(error.message);
    }
  }

  setupCanvas() {
    const resize = () => {
      const displayWidth = this.canvas.clientWidth;
      const displayHeight = this.canvas.clientHeight;

      if (
        this.canvas.width !== displayWidth ||
        this.canvas.height !== displayHeight
      ) {
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;
        this.gl.viewport(0, 0, displayWidth, displayHeight);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    // Configuración inicial de WebGL
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }

  setupShaders() {
    const vertexShaderSource = VERTEX_SHADER;
    const fragmentShaderSource = FRAGMENT_SHADER;
    const vertexShader = this.createShader(
      this.gl.VERTEX_SHADER,
      vertexShaderSource
    );
    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    this.program = this.createProgram(vertexShader, fragmentShader);
    this.gl.useProgram(this.program);

    // Crear geometría de pantalla completa
    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(
      this.program,
      "a_position"
    );
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(
      positionLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      console.error("Error compilando shader:", info);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }

    return shader;
  }

  createProgram(vertexShader, fragmentShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      console.error("Error enlazando programa:", info);
      throw new Error(`Program linking error: ${info}`);
    }

    return program;
  }

  setupUniforms() {
    this.uniforms = {
      u_time: this.gl.getUniformLocation(this.program, "u_time"),
      u_resolution: this.gl.getUniformLocation(this.program, "u_resolution"),
      u_selectedIndex: this.gl.getUniformLocation(
        this.program,
        "u_selectedIndex"
      ),
      u_scrollSpeed: this.gl.getUniformLocation(this.program, "u_scrollSpeed"),
      u_filtersActive: this.gl.getUniformLocation(
        this.program,
        "u_filtersActive"
      ),
    };
  }

  setupEventListeners() {
    // Control de velocidad de scroll
    const scrollSpeedSlider = document.getElementById("scrollSpeed");
    const scrollValue = document.getElementById("scrollValue");

    scrollSpeedSlider.addEventListener("input", (e) => {
      this.scrollSpeed = parseFloat(e.target.value);
      scrollValue.textContent = this.scrollSpeed.toFixed(1);
    });

    // Control de candidata seleccionada
    const selectedIndexInput = document.getElementById("selectedIndex");
    selectedIndexInput.addEventListener("input", (e) => {
      this.selectedIndex = parseInt(e.target.value);
      this.updateMatchStatus();
    });

    // Control de teclas
    document.addEventListener("keydown", (e) => {
      switch (e.key.toLowerCase()) {
        case "h":
          this.toggleInfo();
          break;
        case " ":
          e.preventDefault();
          this.togglePause();
          break;
        case "r":
          this.resetSimulation();
          break;
        case "f":
          this.toggleFiltering();
          break;
      }
    });

    // Botón de filtros
    const toggleFiltersBtn = document.getElementById("toggleFilters");
    toggleFiltersBtn.addEventListener("click", () => {
      this.toggleFiltering();
    });

    const resetBtn = document.getElementById("resetButton");
    resetBtn.addEventListener("click", () => {
      this.resetSimulation();
    });
  }

  generateCandidateDatabase() {
    const candidates = [];
    const nombres = [
      "Sarah Mitchell",
      "Emma Johnson",
      "Lisa Parker",
      "Anna Davis",
      "Maria Rodriguez",
      "Jennifer Wilson",
      "Amy Brown",
      "Jessica Miller",
      "Michelle Taylor",
      "Laura Anderson",
      "Stephanie Thomas",
      "Rachel White",
      "Nicole Garcia",
      "Charity Jones",
      "Amanda Martin",
      "Christina Lee",
    ];

    for (let i = 0; i < 227; i++) {
      const candidate = {
        id: i,
        name:
          i === 156 ? "Charity Jones" : nombres[i % nombres.length] + ` #${i}`,
        age: Math.floor(25 + Math.random() * 15),
        iq: Math.floor(120 + Math.random() * 50),
        psychoScore: Math.random(),
        compatibility: Math.random() * 100,
        discarded: false,
        processed: false,
      };

      // Charity Jones tiene datos especiales
      if (i === 156) {
        candidate.age = 28;
        candidate.iq = 142;
        candidate.psychoScore = 0.95;
        candidate.compatibility = 98.7;
      }

      candidates.push(candidate);
    }

    return candidates;
  }

  updateSimulationStats() {
    const currentTime = (Date.now() - this.startTime) / 1000;

    // Simular procesamiento gradual
    const processRate = 2; // candidatas por segundo
    const expectedProcessed = Math.min(
      227,
      Math.floor(currentTime * processRate)
    );

    this.processedCount = expectedProcessed;

    // Calcular descartadas (aprox 82% según el cuento)
    this.discardedCount = Math.floor(this.processedCount * 0.82);

    // Actualizar UI
    document.getElementById("processedCount").textContent = this.processedCount;
    document.getElementById("discardedCount").textContent = this.discardedCount;

    // Estado del sistema
    let status = "Analizando base de datos...";
    if (this.processedCount >= 227) {
      status = "Búsqueda completada";
    } else if (this.processedCount > 200) {
      status = "Análisis final en progreso";
    } else if (this.processedCount > 100) {
      status = "Aplicando filtros psicológicos";
    }

    document.getElementById("systemStatus").textContent = status;
  }

  updateMatchStatus() {
    const matchStatus = document.getElementById("matchStatus");

    if (this.selectedIndex === 156) {
      matchStatus.textContent = "CHARITY JONES - MATCH PERFECTO";
      matchStatus.style.color = "#4ade80";
    } else if (this.selectedIndex >= 0 && this.selectedIndex < 227) {
      const candidate = this.candidates[this.selectedIndex];
      matchStatus.textContent = `${
        candidate.name
      } - Compatibilidad: ${candidate.compatibility.toFixed(1)}%`;

      if (candidate.compatibility > 80) {
        matchStatus.style.color = "#facc15";
      } else {
        matchStatus.style.color = "#f87171";
      }
    } else {
      matchStatus.textContent = "Procesando...";
      matchStatus.style.color = "#64748b";
    }
  }

  toggleFiltering() {
    this.filtersActive = !this.filtersActive;
    const button = document.getElementById("toggleFilters");
    button.textContent = this.filtersActive ? "ON" : "OFF";
    button.style.backgroundColor = this.filtersActive ? "#059669" : "#dc2626";
  }

  toggleInfo() {
    const storyInfo = document.querySelector(".story-info");
    storyInfo.style.display =
      storyInfo.style.display === "none" ? "block" : "none";
  }

  togglePause() {
    if (this.isRunning) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
  }

  resetSimulation() {
    this.startTime = Date.now();
    this.processedCount = 0;
    this.discardedCount = 0;
    this.selectedIndex = 156;

    // Resetear controles
    document.getElementById("selectedIndex").value = 156;
    document.getElementById("scrollSpeed").value = 1.0;
    document.getElementById("scrollValue").textContent = "1.0";
    this.scrollSpeed = 1.0;

    this.updateMatchStatus();

    console.log("🔄 Simulación reiniciada");
  }

  render(currentTime) {
    const time = (Date.now() - this.startTime) / 1000;

    // Actualizar estadísticas
    this.updateSimulationStats();

    // Limpiar pantalla
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Actualizar uniforms
    this.gl.uniform1f(this.uniforms.u_time, time);
    this.gl.uniform2f(
      this.uniforms.u_resolution,
      this.canvas.width,
      this.canvas.height
    );
    this.gl.uniform1i(this.uniforms.u_selectedIndex, this.selectedIndex);
    this.gl.uniform1f(this.uniforms.u_scrollSpeed, this.scrollSpeed);
    this.gl.uniform1i(
      this.uniforms.u_filtersActive,
      this.filtersActive ? 1 : 0
    );

    // Dibujar
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  startAnimation() {
    this.isRunning = true;

    const animate = (currentTime) => {
      if (!this.isRunning) return;

      this.render(currentTime);
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stopAnimation() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(220, 38, 38, 0.95);
                color: white;
                padding: 20px;
                border-radius: 8px;
                font-family: monospace;
                z-index: 1000;
                text-align: center;
            `;
    errorDiv.innerHTML = `
                <h3>❌ Error del Sistema MULTIVAC</h3>
                <p>${message}</p>
                <button onclick="this.parentElement.remove()" 
                        style="margin-top: 10px; padding: 5px 15px; background: white; color: black; border: none; border-radius: 4px; cursor: pointer;">
                    Cerrar
                </button>
            `;
    document.body.appendChild(errorDiv);
  }
}

// Funciones globales para compatibilidad con HTML
function toggleFiltering() {
  if (window.shaderSystem) {
    window.shaderSystem.toggleFiltering();
  }
}

function resetSimulation() {
  if (window.shaderSystem) {
    window.shaderSystem.resetSimulation();
  }
}

// Inicializar sistema cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  try {
    window.shaderSystem = new AsimovShaderSystem();

    // Mensaje de bienvenida
    console.log(`
            ╔════════════════════════════════════════╗
            ║           SISTEMA MULTIVAC/Joe v2.1    ║
            ║        Basado en "Amor Verdadero"      ║
            ║            de Isaac Asimov             ║
            ╠════════════════════════════════════════╣
            ║ Controles:                             ║
            ║ • H: Mostrar/ocultar información       ║
            ║ • Espacio: Pausar/reanudar             ║
            ║ • R: Reiniciar simulación              ║
            ║ • F: Toggle filtros                    ║
            ╚════════════════════════════════════════╝
            `);
  } catch (error) {
    console.error("Error fatal inicializando sistema:", error);
  }
});

// Limpiar recursos al cerrar
window.addEventListener("beforeunload", () => {
  if (window.shaderSystem) {
    window.shaderSystem.stopAnimation();
  }
});
