package io.github.fut0r.almuslim.compass;

import android.app.Activity;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.SystemClock;
import android.view.Display;
import android.view.Surface;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The compass for the qiblah screen, read straight from the phone's sensors.
 *
 * The heading comes from the fused rotation sensor (magnetometer, accelerometer
 * and, where there is one, gyroscope), or from the magnetometer and
 * accelerometer on phones without it. It is the direction the top of the
 * screen points, clockwise from magnetic north; the app adds the magnetic
 * declination. The magnetometer's own accuracy is reported with it, so the app
 * can ask for the phone to be calibrated instead of showing a wrong direction.
 */
@CapacitorPlugin(name = "Compass")
public class CompassPlugin extends Plugin implements SensorEventListener {

    /** Headings are sent at most this often; the screen cannot show more. */
    private static final long MIN_INTERVAL_MS = 50;
    /** Smoothing of the raw magnetometer and accelerometer when there is no fused sensor. */
    private static final float RAW_SMOOTHING = 0.15f;

    private SensorManager sensors;
    private Sensor rotation;
    private Sensor accelerometer;
    private Sensor magnetometer;

    private boolean wanted;
    private boolean listening;
    private int accuracy = -1;
    private long lastSent;

    private final float[] rotationMatrix = new float[9];
    private final float[] remapped = new float[9];
    private final float[] orientation = new float[3];
    private final float[] gravity = new float[3];
    private final float[] geomagnetic = new float[3];
    private boolean hasGravity;
    private boolean hasGeomagnetic;

    @Override
    public void load() {
        sensors = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        if (sensors == null) return;
        magnetometer = sensors.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
        accelerometer = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        rotation = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if (rotation == null) rotation = sensors.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
    }

    /** Without a magnetometer nothing on the phone knows where north is. */
    private boolean available() {
        return sensors != null && magnetometer != null && (rotation != null || accelerometer != null);
    }

    /** Starts sending "heading" events. Resolves with whether the phone has a compass at all. */
    @PluginMethod
    public void start(PluginCall call) {
        wanted = true;
        boolean started = register();
        JSObject result = new JSObject();
        result.put("available", started);
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        wanted = false;
        unregister();
        call.resolve();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (wanted) register();
    }

    /** Sensors cost battery, so they are released whenever the app is not in front. */
    @Override
    protected void handleOnPause() {
        unregister();
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        unregister();
        super.handleOnDestroy();
    }

    private boolean register() {
        if (!available()) return false;
        if (listening) return true;
        hasGravity = false;
        hasGeomagnetic = false;
        accuracy = -1;
        boolean ok;
        if (rotation != null) {
            ok = sensors.registerListener(this, rotation, SensorManager.SENSOR_DELAY_UI);
            // Listened to only for its accuracy, which says when the compass needs calibrating.
            sensors.registerListener(this, magnetometer, SensorManager.SENSOR_DELAY_NORMAL);
        } else {
            ok = sensors.registerListener(this, magnetometer, SensorManager.SENSOR_DELAY_UI);
            ok = sensors.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_UI) && ok;
        }
        listening = ok;
        if (!ok) sensors.unregisterListener(this);
        return ok;
    }

    private void unregister() {
        if (sensors != null && listening) sensors.unregisterListener(this);
        listening = false;
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int newAccuracy) {
        if (sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) accuracy = newAccuracy;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        int type = event.sensor.getType();
        if (type == Sensor.TYPE_MAGNETIC_FIELD) {
            accuracy = event.accuracy;
            if (rotation != null) return;
            smooth(geomagnetic, event.values, hasGeomagnetic);
            hasGeomagnetic = true;
        } else if (type == Sensor.TYPE_ACCELEROMETER) {
            smooth(gravity, event.values, hasGravity);
            hasGravity = true;
        }

        if (type == Sensor.TYPE_ROTATION_VECTOR || type == Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR) {
            SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values);
        } else if (!hasGravity || !hasGeomagnetic || !SensorManager.getRotationMatrix(rotationMatrix, null, gravity, geomagnetic)) {
            return;
        }

        long now = SystemClock.elapsedRealtime();
        if (now - lastSent < MIN_INTERVAL_MS) return;
        lastSent = now;

        // The sensors are fixed to the phone; the heading wanted is that of the top of the screen as it is held.
        int axisX = SensorManager.AXIS_X;
        int axisY = SensorManager.AXIS_Y;
        switch (displayRotation()) {
            case Surface.ROTATION_90:
                axisX = SensorManager.AXIS_Y;
                axisY = SensorManager.AXIS_MINUS_X;
                break;
            case Surface.ROTATION_180:
                axisX = SensorManager.AXIS_MINUS_X;
                axisY = SensorManager.AXIS_MINUS_Y;
                break;
            case Surface.ROTATION_270:
                axisX = SensorManager.AXIS_MINUS_Y;
                axisY = SensorManager.AXIS_X;
                break;
            default:
                break;
        }
        if (!SensorManager.remapCoordinateSystem(rotationMatrix, axisX, axisY, remapped)) return;
        SensorManager.getOrientation(remapped, orientation);

        double heading = Math.toDegrees(orientation[0]);
        if (Double.isNaN(heading)) return;
        JSObject data = new JSObject();
        data.put("heading", (heading % 360 + 360) % 360);
        // How far the screen is from lying flat, in degrees.
        data.put("tilt", Math.max(Math.abs(Math.toDegrees(orientation[1])), Math.abs(Math.toDegrees(orientation[2]))));
        data.put("accuracy", accuracy);
        notifyListeners("heading", data);
    }

    private static void smooth(float[] target, float[] values, boolean primed) {
        for (int index = 0; index < 3; index += 1) {
            target[index] = primed ? target[index] + RAW_SMOOTHING * (values[index] - target[index]) : values[index];
        }
    }

    private int displayRotation() {
        Activity activity = getActivity();
        if (activity == null) return Surface.ROTATION_0;
        Display display = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? activity.getDisplay() : activity.getWindowManager().getDefaultDisplay();
        return display == null ? Surface.ROTATION_0 : display.getRotation();
    }
}
