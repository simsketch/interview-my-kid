import ExpoModulesCore

#if canImport(FoundationModels)
import FoundationModels
#endif

public class FoundationModelsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FoundationModels")

    AsyncFunction("isAvailable") { () -> Bool in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        if case .available = SystemLanguageModel.default.availability {
          return true
        }
      }
      #endif
      return false
    }

    AsyncFunction("unavailableReason") { () -> String? in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        switch SystemLanguageModel.default.availability {
        case .available:
          return nil
        case .unavailable(let reason):
          return String(describing: reason)
        @unknown default:
          return "unknown"
        }
      } else {
        return "iOS 26.0 or newer required"
      }
      #else
      return "FoundationModels framework not available in this build"
      #endif
    }

    AsyncFunction("generate") { (instructions: String, prompt: String) async throws -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        switch SystemLanguageModel.default.availability {
        case .available:
          break
        case .unavailable(let reason):
          throw NSError(
            domain: "FoundationModels",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "On-device model unavailable: \(reason)"]
          )
        @unknown default:
          throw NSError(
            domain: "FoundationModels",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "On-device model unavailable"]
          )
        }
        let session = LanguageModelSession(instructions: instructions)
        let response = try await session.respond(to: prompt)
        return response.content
      }
      #endif
      throw NSError(
        domain: "FoundationModels",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "Apple FoundationModels requires iOS 26.0 or newer"]
      )
    }
  }
}
