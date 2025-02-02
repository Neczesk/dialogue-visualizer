extends Resource

@export var name: String
@export var character: String
@export var character_name: String
@export_file("*.png", "*.jpg", "*.webp") var character_picture: String
@export var start_node_id: String

# Custom emotion dictionary type for better editor support
class EmotionPortrait:
    extends Resource
    @export_file("*.png", "*.jpg", "*.webp") var portrait_path: String

# Use a typed array for emotions to get file picker in editor
@export var emotion_portraits: Array[EmotionPortrait]
# Runtime dictionary built from emotion_portraits
var emotions: Dictionary

func _init():
    # Convert emotion_portraits array to dictionary on load
    emotions = {}
    for portrait in emotion_portraits:
        if portrait and portrait.portrait_path:
            emotions[portrait.name] = portrait.portrait_path

@export var nodes: Dictionary

func get_node(id: String) -> Dictionary:
    return nodes.get(id, {})

func get_emotion_portrait(emotion: String) -> String:
    return emotions.get(emotion, emotions.get("default", character_picture))

func get_choices(node_id: String) -> Array:
    var node = get_node(node_id)
    return node.get("choices", [])

func get_next_node_id(node_id: String, choice_index: int) -> String:
    var choices = get_choices(node_id)
    if choice_index >= 0 and choice_index < choices.size():
        return choices[choice_index].get("nextNodeId", "")
    return ""

func get_text(node_id: String) -> String:
    var node = get_node(node_id)
    return node.get("text", "")

func get_speaker(node_id: String) -> String:
    var node = get_node(node_id)
    return node.get("speaker", character_name)

func get_emotion(node_id: String) -> String:
    var node = get_node(node_id)
    return node.get("emotion", "default") 