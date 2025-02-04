@tool
extends Resource
class_name DialogueTree

@export var name: String
@export var characters: Dictionary = {}
@export var start_node_id: String
@export var nodes: Dictionary = {}

# Runtime dictionary built from emotion_portraits
var emotions: Dictionary

func _init():
    pass

# Helper function to get a character's portrait
func get_character_portrait(character_id: String, emotion: String = "") -> String:
    if not characters.has(character_id):
        return ""
    
    var character = characters[character_id]
    if emotion and character.portraits.has(emotion):
        return character.portraits[emotion]
    return character.portraits[character.default_emotion]

# Get the text and emotion for a node, considering alternate texts
func get_node_text_and_emotion(node_id: String, game_flags: Array = [], game_state: Dictionary = {}) -> Dictionary:
    if not nodes.has(node_id):
        return {"text": "", "emotion": ""}
    
    var node = nodes[node_id]
    
    # Check alternate texts
    if node.has("alternate_texts"):
        for alt in node.alternate_texts:
            if check_prerequisites(alt.get("prerequisites", {}), game_flags, game_state):
                return {
                    "text": alt.text,
                    "emotion": alt.get("emotion", node.get("emotion", "default"))
                }
    
    return {
        "text": node.text,
        "emotion": node.get("emotion", "default")
    }

# Check if a choice is available based on prerequisites
func is_choice_available(choice: Dictionary, game_flags: Array = [], game_state: Dictionary = {}) -> bool:
    if not choice.has("prerequisites"):
        return true
    return check_prerequisites(choice.prerequisites, game_flags, game_state)

# Get the next node ID for a choice, considering alternate destinations
func get_next_node_id(choice: Dictionary, game_flags: Array = [], game_state: Dictionary = {}) -> String:
    if choice.has("alternate_destinations"):
        for dest in choice.alternate_destinations:
            if check_prerequisites(dest.prerequisites, game_flags, game_state):
                return dest.next_node_id
    return choice.next_node_id

# Helper to check prerequisites
func check_prerequisites(prereqs: Dictionary, game_flags: Array, game_state: Dictionary) -> bool:
    if prereqs.has("required_flags"):
        for flag in prereqs.required_flags:
            if not flag in game_flags:
                return false
    
    if prereqs.has("blocked_flags"):
        for flag in prereqs.blocked_flags:
            if flag in game_flags:
                return false
    
    if prereqs.has("state_conditions"):
        for condition in prereqs.state_conditions:
            var value = game_state.get(condition.key, 0)
            match condition.operator:
                "=": if value != condition.value: return false
                ">": if value <= condition.value: return false
                "<": if value >= condition.value: return false
                ">=": if value < condition.value: return false
                "<=": if value > condition.value: return false
    
    return true

# Apply state changes from a choice
func apply_choice_changes(choice: Dictionary, game_flags: Array, game_state: Dictionary) -> Dictionary:
    var result = {
        "flags": game_flags.duplicate(),
        "state": game_state.duplicate()
    }
    
    if choice.has("flag_changes"):
        if choice.flag_changes.has("add"):
            for flag in choice.flag_changes.add:
                if not flag in result.flags:
                    result.flags.append(flag)
        if choice.flag_changes.has("remove"):
            for flag in choice.flag_changes.remove:
                result.flags.erase(flag)
    
    if choice.has("state_changes"):
        for change in choice.state_changes:
            var current = result.state.get(change.key, 0)
            match change.get("operation", "set"):
                "add": result.state[change.key] = current + change.value
                "subtract": result.state[change.key] = current - change.value
                _: result.state[change.key] = change.value
    
    return result

func get_node(id: String) -> Dictionary:
    return nodes.get(id, {})

func get_emotion_portrait(emotion: String) -> String:
    return emotions.get(emotion, emotions.get("default", ""))

func get_choices(node_id: String) -> Array:
    var node = get_node(node_id)
    return node.get("choices", [])

func get_text(node_id: String) -> String:
    var node = get_node(node_id)
    return node.get("text", "")

func get_speaker(node_id: String) -> String:
    var node = get_node(node_id)
    return node.get("speaker", "")

func get_emotion(node_id: String) -> String:
    var node = get_node(node_id)
    return node.get("emotion", "default") 