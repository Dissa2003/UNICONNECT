const tf = require('@tensorflow/tfjs');
const path = require('path');
const fs = require('fs');

/**
 * These values are from your Google Colab StandardScaler.
 * They are essential to normalize the 20 input features correctly.
 */
const featureMeans = [
    11.11818182, 17.63522727, 0.49659091, 12.57840909, 2.52954545, 2.1875,
    2.64545455, 2.77613636, 2.66818182, 2.50568182, 2.71818182, 2.78295455,
    2.77727273, 2.60568182, 2.63295455, 2.66704545, 1.87272727, 2.76363636,
    2.78409091, 2.62613636
];

const featureScales = [
    6.11180946, 8.96165493, 0.49998838, 7.63638046, 1.40907441, 0.83398176,
    1.5393999, 1.41377109, 1.3164644, 1.1190355, 1.39971957, 1.42762689,
    1.42555629, 1.32209011, 1.39497651, 1.53646744, 1.04105795, 1.42415699,
    1.41058389, 1.52031653
];

async function predictStressLevel(inputData) {
    try {
        const modelDir = path.join(__dirname, 'model_files');

        // Read model.json
        const modelJSON = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf8'));

        // ── Keras 3 → TF.js topology patch ─────────────────────────────────────
        // Keras 3 wraps the real config inside modelTopology.model_config
        let modelTopology = modelJSON.modelTopology;
        if (modelTopology.model_config) {
            modelTopology = modelTopology.model_config;
        }
        // Keras 3 InputLayer uses `batch_shape`; TF.js expects `batch_input_shape`
        if (modelTopology.config && Array.isArray(modelTopology.config.layers)) {
            for (const layer of modelTopology.config.layers) {
                if (layer.class_name === 'InputLayer' && layer.config) {
                    if (layer.config.batch_shape && !layer.config.batch_input_shape) {
                        layer.config.batch_input_shape = layer.config.batch_shape;
                        delete layer.config.batch_shape;
                    }
                }
            }
        }
        // ────────────────────────────────────────────────────────────────────────

        // Read and concatenate all weight shard files
        const shardBuffers = modelJSON.weightsManifest[0].paths.map(p =>
            fs.readFileSync(path.join(modelDir, p))
        );
        const combined = Buffer.concat(shardBuffers);
        const weightData = combined.buffer.slice(
            combined.byteOffset,
            combined.byteOffset + combined.byteLength
        );

        // ── Keras 3 weight-name patch ────────────────────────────────────────────
        // Keras 3 prefixes every weight with the model name, e.g. "sequential/dense/kernel"
        // TF.js loadLayersModel expects bare names like "dense/kernel"
        const weightSpecs = modelJSON.weightsManifest[0].weights.map(spec => ({
            ...spec,
            name: spec.name.replace(/^[^/]+\//, ''), // strip first "modelName/" segment
        }));
        // ────────────────────────────────────────────────────────────────────────

        // Load the model from patched in-memory artifacts
        const model = await tf.loadLayersModel(tf.io.fromMemory({
            modelTopology,
            weightSpecs,
            weightData,
        }));

        // Standardize the input: (x - mean) / scale
        const scaledData = inputData.map((value, index) =>
            (value - featureMeans[index]) / featureScales[index]
        );

        // Create a 2D Tensor for the model input
        const inputTensor = tf.tensor2d([scaledData], [1, 20]);

        // Run prediction
        const prediction = model.predict(inputTensor);
        const resultIndex = prediction.argMax(1).dataSync()[0];

        // Return label and numeric value
        const labels = ["Low", "Medium", "High"];
        return {
            index: resultIndex,
            label: labels[resultIndex]
        };
    } catch (error) {
        console.error("AI Engine Error:", error);
        return null;
    }
}

module.exports = { predictStressLevel };