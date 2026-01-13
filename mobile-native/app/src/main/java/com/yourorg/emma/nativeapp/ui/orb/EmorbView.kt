package com.yourorg.emma.nativeapp.ui.orb

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.view.View

class EmorbView(context: Context) : GLSurfaceView(context) {
    private val renderer = EmorbRenderer()
    private var isPaused = false
    private var inlineMode = false
    init {
        setEGLContextClientVersion(2)
        setEGLConfigChooser(8, 8, 8, 8, 16, 0) // 32-bit surface so alpha channel stays transparent
        holder.setFormat(PixelFormat.TRANSLUCENT)
        setZOrderOnTop(true)
        setBackgroundColor(Color.TRANSPARENT)
        setRenderer(renderer)
        renderMode = RENDERMODE_CONTINUOUSLY
    }

    fun setInlineMode(inline: Boolean) {
        inlineMode = inline
        holder.setFormat(PixelFormat.TRANSLUCENT)
        setZOrderOnTop(!inlineMode)
        setBackgroundColor(Color.TRANSPARENT)
    }

    fun setBackdropColor(color: Int?, enabled: Boolean) {
        val resolved = color ?: Color.TRANSPARENT
        queueEvent { renderer.setBackdropColor(resolved, enabled) }
    }

    fun prepareForDisplay() {
        visibility = View.VISIBLE
        holder.setFormat(PixelFormat.TRANSLUCENT)
        setZOrderOnTop(!inlineMode)
        setBackgroundColor(Color.TRANSPARENT)
        if (isPaused) {
            onResume()
            isPaused = false
        }
    }

    fun prepareForRemoval() {
        visibility = View.GONE
        if (!isPaused) {
            onPause()
            isPaused = true
        }
    }

    fun setHueShift(degrees: Float) {
        queueEvent { renderer.setHueShift(degrees) }
    }
}

private class EmorbRenderer : GLSurfaceView.Renderer {
    private var program = 0
    private var posHandle = 0
    private var uvHandle = 0
    private var timeHandle = 0
    private var resHandle = 0
    private var hueHandle = 0
    private var bgHandle = 0
    private var bgEnabledHandle = 0
    private var hoverHandle = 0
    private var rotHandle = 0
    private var hoverIntensityHandle = 0
    @Volatile private var hueShift = 270f
    @Volatile private var bgEnabled = false
    @Volatile private var bgColor = floatArrayOf(0f, 0f, 0f)

    private val startTime = System.nanoTime()
    private var width = 0
    private var height = 0

    override fun onSurfaceCreated(unused: javax.microedition.khronos.opengles.GL10?, config: javax.microedition.khronos.egl.EGLConfig?) {
        program = buildProgram(VERT, FRAG)
        GLES20.glUseProgram(program)
        posHandle = GLES20.glGetAttribLocation(program, "position")
        uvHandle = GLES20.glGetAttribLocation(program, "uv")
        timeHandle = GLES20.glGetUniformLocation(program, "iTime")
        resHandle = GLES20.glGetUniformLocation(program, "iResolution")
        hueHandle = GLES20.glGetUniformLocation(program, "hue")
        bgHandle = GLES20.glGetUniformLocation(program, "bgColor")
        bgEnabledHandle = GLES20.glGetUniformLocation(program, "bgEnabled")
        hoverHandle = GLES20.glGetUniformLocation(program, "hover")
        rotHandle = GLES20.glGetUniformLocation(program, "rot")
        hoverIntensityHandle = GLES20.glGetUniformLocation(program, "hoverIntensity")
    }

    override fun onSurfaceChanged(unused: javax.microedition.khronos.opengles.GL10?, width: Int, height: Int) {
        this.width = width
        this.height = height
        GLES20.glViewport(0, 0, width, height)
    }

    override fun onDrawFrame(unused: javax.microedition.khronos.opengles.GL10?) {
        GLES20.glClearColor(0f, 0f, 0f, 0f)
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
        val t = (System.nanoTime() - startTime) / 1_000_000_000.0f
        GLES20.glUseProgram(program)
        GLES20.glUniform1f(timeHandle, t)
        GLES20.glUniform3f(resHandle, width.toFloat(), height.toFloat(), width.toFloat() / maxOf(1f, height.toFloat()))
        GLES20.glUniform1f(hueHandle, hueShift)
        GLES20.glUniform3f(bgHandle, bgColor[0], bgColor[1], bgColor[2])
        GLES20.glUniform1f(bgEnabledHandle, if (bgEnabled) 1f else 0f)
        GLES20.glUniform1f(hoverHandle, 0.8f)
        GLES20.glUniform1f(rotHandle, t * 0.2f)
        GLES20.glUniform1f(hoverIntensityHandle, 0.35f)

        GLES20.glEnableVertexAttribArray(posHandle)
        GLES20.glVertexAttribPointer(posHandle, 2, GLES20.GL_FLOAT, false, 0, POS_BUFFER)
        GLES20.glEnableVertexAttribArray(uvHandle)
        GLES20.glVertexAttribPointer(uvHandle, 2, GLES20.GL_FLOAT, false, 0, UV_BUFFER)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, 3)
    }

    fun setHueShift(degrees: Float) {
        hueShift = degrees
    }

    fun setBackdropColor(colorInt: Int, enabled: Boolean) {
        bgEnabled = enabled
        bgColor[0] = Color.red(colorInt) / 255f
        bgColor[1] = Color.green(colorInt) / 255f
        bgColor[2] = Color.blue(colorInt) / 255f
    }

    private fun buildProgram(vertSrc: String, fragSrc: String): Int {
        val vs = loadShader(GLES20.GL_VERTEX_SHADER, vertSrc)
        val fs = loadShader(GLES20.GL_FRAGMENT_SHADER, fragSrc)
        val program = GLES20.glCreateProgram()
        GLES20.glAttachShader(program, vs)
        GLES20.glAttachShader(program, fs)
        GLES20.glLinkProgram(program)
        return program
    }

    private fun loadShader(type: Int, code: String): Int {
        val shader = GLES20.glCreateShader(type)
        GLES20.glShaderSource(shader, code)
        GLES20.glCompileShader(shader)
        return shader
    }

    companion object {
        private val POS_DATA = floatArrayOf(
            -1f, -1f,
            3f, -1f,
            -1f, 3f
        )
        private val UV_DATA = floatArrayOf(
            0f, 0f,
            2f, 0f,
            0f, 2f
        )

        private val POS_BUFFER = java.nio.ByteBuffer.allocateDirect(POS_DATA.size * 4)
            .order(java.nio.ByteOrder.nativeOrder()).asFloatBuffer().apply {
                put(POS_DATA)
                position(0)
            }
        private val UV_BUFFER = java.nio.ByteBuffer.allocateDirect(UV_DATA.size * 4)
            .order(java.nio.ByteOrder.nativeOrder()).asFloatBuffer().apply {
                put(UV_DATA)
                position(0)
            }

        private const val VERT = """
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = vec4(position, 0.0, 1.0);
            }
        """

        // Fragment shader adapted from emma-orb.js for GLES2
        private const val FRAG = """
            precision mediump float;
            uniform float iTime;
            uniform vec3 iResolution;
            uniform float hue;
            uniform vec3 bgColor;
            uniform float bgEnabled;
            uniform float hover;
            uniform float rot;
            uniform float hoverIntensity;
            varying vec2 vUv;

            vec3 rgb2yiq(vec3 c) {
              float y = dot(c, vec3(0.299, 0.587, 0.114));
              float i = dot(c, vec3(0.596, -0.274, -0.322));
              float q = dot(c, vec3(0.211, -0.523, 0.312));
              return vec3(y, i, q);
            }
            vec3 yiq2rgb(vec3 c) {
              float r = c.x + 0.956 * c.y + 0.621 * c.z;
              float g = c.x - 0.272 * c.y - 0.647 * c.z;
              float b = c.x - 1.106 * c.y + 1.703 * c.z;
              return vec3(r, g, b);
            }
            vec3 adjustHue(vec3 color, float hueDeg) {
              float hueRad = hueDeg * 3.14159265 / 180.0;
              vec3 yiq = rgb2yiq(color);
              float cosA = cos(hueRad);
              float sinA = sin(hueRad);
              float i = yiq.y * cosA - yiq.z * sinA;
              float q = yiq.y * sinA + yiq.z * cosA;
              yiq.y = i;
              yiq.z = q;
              return yiq2rgb(yiq);
            }
            vec3 hash33(vec3 p3) {
              p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
              p3 += dot(p3, p3.yxz + 19.19);
              return -1.0 + 2.0 * fract(vec3(
                p3.x + p3.y,
                p3.x + p3.z,
                p3.y + p3.z
              ) * p3.zyx);
            }
            float snoise3(vec3 p) {
              const float K1 = 0.333333333;
              const float K2 = 0.166666667;
              vec3 i = floor(p + (p.x + p.y + p.z) * K1);
              vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
              vec3 e = step(vec3(0.0), d0 - d0.yzx);
              vec3 i1 = e * (1.0 - e.zxy);
              vec3 i2 = 1.0 - e.zxy * (1.0 - e);
              vec3 d1 = d0 - (i1 - K2);
              vec3 d2 = d0 - (i2 - K1);
              vec3 d3 = d0 - 0.5;
              vec4 h = max(0.6 - vec4(
                dot(d0, d0),
                dot(d1, d1),
                dot(d2, d2),
                dot(d3, d3)
              ), 0.0);
              vec4 n = h * h * h * h * vec4(
                dot(d0, hash33(i)),
                dot(d1, hash33(i + i1)),
                dot(d2, hash33(i + i2)),
                dot(d3, hash33(i + 1.0))
              );
              return dot(vec4(31.316), n);
            }
            vec4 extractAlpha(vec3 colorIn) {
              float a = max(max(colorIn.r, colorIn.g), colorIn.b);
              return vec4(colorIn.rgb / (a + 1e-5), a);
            }
            const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078);
            const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725);
            const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000);
            const float innerRadius = 0.6;
            const float noiseScale = 0.65;
            float light1(float intensity, float attenuation, float dist) {
              return intensity / (1.0 + dist * attenuation);
            }
            float light2(float intensity, float attenuation, float dist) {
              return intensity / (1.0 + dist * dist * attenuation);
            }
            vec4 draw(vec2 uv) {
              vec3 color1 = adjustHue(baseColor1, hue);
              vec3 color2 = adjustHue(baseColor2, hue);
              vec3 color3 = adjustHue(baseColor3, hue);
              float ang = atan(uv.y, uv.x);
              float len = length(uv);
              float invLen = len > 0.0 ? 1.0 / len : 0.0;
              float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
              float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
              float d0 = distance(uv, (r0 * invLen) * uv);
              float v0 = light1(1.0, 10.0, d0);
              v0 *= smoothstep(r0 * 1.05, r0, len);
              float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;
              float a = iTime * -1.0;
              vec2 pos = vec2(cos(a), sin(a)) * r0;
              float d = distance(uv, pos);
              float v1 = light2(1.5, 5.0, d);
              v1 *= light1(1.0, 50.0, d0);
              float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
              float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
              vec3 col = mix(color1, color2, cl);
              col = mix(color3, col, v0);
              col = (col + v1) * v2 * v3;
              col = clamp(col, 0.0, 1.0);
              return extractAlpha(col);
            }
            vec4 mainImage(vec2 fragCoord) {
              vec2 center = iResolution.xy * 0.5;
              float size = min(iResolution.x, iResolution.y);
              vec2 uv = (fragCoord - center) / size * 2.0;
              float angle = rot;
              float s = sin(angle);
              float c = cos(angle);
              uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
              uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
              uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);
              return draw(uv);
            }
            void main() {
              vec2 fragCoord = vUv * iResolution.xy;
              vec4 col = mainImage(fragCoord);
              vec3 blended = mix(bgColor, col.rgb, col.a);
              vec3 outRgb = mix(col.rgb * col.a, blended, bgEnabled);
              vec2 center = iResolution.xy * 0.5;
              float size = min(iResolution.x, iResolution.y);
              vec2 uv = (fragCoord - center) / size * 2.0;
              float len = length(uv);
              float mask = 1.0 - smoothstep(1.0, 1.05, len);
              float fillAlpha = max(col.a, mask);
              float outAlpha = mix(col.a, fillAlpha, bgEnabled);
              gl_FragColor = vec4(outRgb, outAlpha);
            }
        """
    }
}
